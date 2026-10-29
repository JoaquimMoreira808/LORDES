#!/usr/bin/env python3
"""LORDES: arquivos estáticos e saves JSON por nome, sem dependências externas."""
import argparse
from datetime import datetime, timezone
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import math
import os
from pathlib import Path
import re
import tempfile
import threading
import unicodedata
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
MAX_BODY = 8 * 1024 * 1024
ID = re.compile(r'^[a-z][a-z0-9-]*$')

class SaveError(ValueError):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status

def player_name(value):
    if not isinstance(value, str) or any(unicodedata.category(c).startswith('C') for c in value):
        raise SaveError('Informe um nome válido.')
    name = ' '.join(unicodedata.normalize('NFKC', value).split())
    if not 1 <= len(name) <= 40 or not all(c.isalnum() or c in " _-.'" for c in name):
        raise SaveError('Use de 1 a 40 letras, números, espaços, pontos, hífens ou apóstrofos.')
    return name, name.casefold()

def valid_state(state):
    if not isinstance(state, dict) or type(state.get('version')) is not int or state['version'] != 1:
        raise SaveError('Versão de partida não suportada.')
    if not isinstance(state.get('paused'), bool):
        raise SaveError('Estado de pausa inválido.')
    for field in ('inventory', 'areas', 'citizens'):
        if not isinstance(state.get(field), dict):
            raise SaveError(f'Estado inválido: {field}.')
    for key, count in state['inventory'].items():
        if not ID.fullmatch(key) or type(count) is not int or not 0 <= count <= 9007199254740991:
            raise SaveError('Inventário inválido.')
    for key, area in state['areas'].items():
        if not ID.fullmatch(key) or key == 'idle' or not isinstance(area, dict) or area.get('id') != key or not isinstance(area.get('definitionId'), str) or not ID.fullmatch(area['definitionId']):
            raise SaveError('Área de ação inválida.')
        if 'nome' in area and (not isinstance(area['nome'], str) or not 1 <= len(area['nome']) <= 120):
            raise SaveError('Nome de área inválido.')
    for key, citizen in state['citizens'].items():
        if not isinstance(citizen, dict) or type(citizen.get('id')) is not int or not 1 <= citizen['id'] <= 9007199254740991 or str(citizen['id']) != key:
            raise SaveError('Cidadão inválido.')
        if any(not isinstance(citizen.get(field), str) or not ID.fullmatch(citizen[field]) for field in ('deckId', 'bundleId')):
            raise SaveError('Origem do cidadão inválida.')
        if citizen.get('areaId') is not None and citizen['areaId'] not in state['areas']:
            raise SaveError('Cidadão em área inexistente.')
        progress = citizen.get('progress')
        if not isinstance(progress, dict) or any(not ID.fullmatch(k) or type(v) not in (int, float) or not math.isfinite(v) or v < 0 for k, v in progress.items()):
            raise SaveError('Progresso inválido.')
    return state

class SaveStore:
    def __init__(self, directory):
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()

    def path_for(self, name):
        display, identity = player_name(name)
        slug = unicodedata.normalize('NFKD', identity).encode('ascii', 'ignore').decode()
        slug = re.sub(r'[^a-z0-9]+', '-', slug).strip('-')[:40] or 'povo'
        digest = hashlib.sha256(identity.encode()).hexdigest()[:16]
        return display, self.directory / f'{slug}-{digest}.json'

    def load(self, name):
        display, path = self.path_for(name)
        with self.lock:
            if not path.exists():
                return {'name': display, 'state': None, 'revision': 0, 'savedAt': None}
            try:
                record = json.loads(path.read_text(encoding='utf-8'))
                if record.get('formatVersion') != 1 or type(record.get('revision')) is not int or record['revision'] < 1 or player_name(record.get('name'))[1] != player_name(name)[1]:
                    raise ValueError('Formato inválido')
                valid_state(record.get('state'))
                return record
            except (ValueError, KeyError, TypeError, AttributeError) as error:
                raise SaveError('O save existente está inválido. Ele foi preservado para recuperação.', 409) from error

    def save(self, name, state, revision):
        display, path = self.path_for(name)
        valid_state(state)
        if type(revision) is not int or revision < 0:
            raise SaveError('Revisão inválida.')
        with self.lock:
            existing = self.load(name)
            if revision != existing['revision']:
                raise SaveError('Esta partida foi salva em outra aba. Saia e entre novamente para carregar a versão atual.', 409)
            record = {'formatVersion': 1, 'name': existing['name'] if existing['state'] is not None else display,
                      'revision': revision + 1, 'savedAt': datetime.now(timezone.utc).isoformat(), 'state': state}
            temporary = None
            try:
                with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=self.directory, prefix='.save-', suffix='.tmp', delete=False) as file:
                    temporary = Path(file.name)
                    json.dump(record, file, ensure_ascii=False, allow_nan=False, indent=2)
                    file.flush()
                    os.fsync(file.fileno())
                os.replace(temporary, path)
            finally:
                if temporary is not None and temporary.exists(): temporary.unlink()
            return record

def make_handler(store, static_directory=ROOT / 'dist'):
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(static_directory), **kwargs)

        def json_response(self, status, data):
            body = json.dumps(data, ensure_ascii=False, allow_nan=False).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_POST(self):
            if urlsplit(self.path).path not in ('/api/load', '/api/save'):
                self.json_response(404, {'error': 'Rota inexistente.'}); return
            try:
                origin = self.headers.get('Origin')
                if origin and urlsplit(origin).netloc != self.headers.get('Host'):
                    raise SaveError('Origem não permitida.', 403)
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= MAX_BODY: raise SaveError('Tamanho da partida inválido.', 413)
                data = json.loads(self.rfile.read(length))
                if not isinstance(data, dict): raise SaveError('Dados inválidos.')
                if urlsplit(self.path).path == '/api/load':
                    result = store.load(data.get('name'))
                else:
                    record = store.save(data.get('name'), data.get('state'), data.get('revision'))
                    result = {key: record[key] for key in ('name', 'revision', 'savedAt')}
                self.json_response(200, result)
            except SaveError as error:
                self.json_response(error.status, {'error': str(error)})
            except (ValueError, TypeError):
                self.json_response(400, {'error': 'JSON inválido.'})
            except OSError:
                self.json_response(500, {'error': 'Não foi possível acessar a pasta de saves. Verifique espaço e permissões.'})
    return Handler

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8080)
    parser.add_argument('--bind', default='127.0.0.1')
    parser.add_argument('--saves-dir', type=Path, default=ROOT / 'saves')
    args = parser.parse_args()
    store = SaveStore(args.saves_dir)
    server = ThreadingHTTPServer((args.bind, args.port), make_handler(store))
    print(f'LORDES: http://{args.bind}:{args.port} | Saves: {store.directory}', flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()

if __name__ == '__main__': main()
