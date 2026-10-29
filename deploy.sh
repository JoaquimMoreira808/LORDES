#!/usr/bin/env bash
# Uso: ./deploy.sh [porta]  (padrão: 8080)
set -Eeuo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
port="${1:-8080}"
server_pid=''
tunnel_pid=''

fail() { printf 'Erro: %s\n' "$*" >&2; exit 1; }
cleanup() {
    trap - EXIT INT TERM
    if [[ -n "$tunnel_pid" ]]; then
        kill "$tunnel_pid" 2>/dev/null || true
        wait "$tunnel_pid" 2>/dev/null || true
    fi
    if [[ -n "$server_pid" ]]; then
        kill "$server_pid" 2>/dev/null || true
        wait "$server_pid" 2>/dev/null || true
    fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

[[ $# -le 1 ]] || fail 'Use ./deploy.sh [porta].'
[[ "$port" =~ ^[0-9]{1,5}$ ]] || fail 'A porta deve ser um número entre 1 e 65535.'
port="$((10#$port))"
(( port >= 1 && port <= 65535 )) || fail 'A porta deve estar entre 1 e 65535.'
command -v python3 >/dev/null || fail 'Instale o Python 3 para servir os arquivos.'
command -v ngrok >/dev/null || fail 'Instale o ngrok e tente novamente.'
[[ -f "$project_dir/server.py" ]] || fail 'Não encontrei server.py junto ao script.'
[[ -f "$project_dir/dist/index.html" ]] || fail 'Não encontrei dist/index.html junto ao script.'

# Usa a variável de ambiente ou a configuração existente do ngrok.
# Se nenhum token estiver configurado, solicita sem exibir ou salvar o valor.
if [[ -z "${NGROK_AUTHTOKEN:-}" ]]; then
    if ! python3 - <<'PY'
import os, pathlib, re, sys
home = pathlib.Path.home()
config_root = pathlib.Path(os.environ.get('XDG_CONFIG_HOME', home / '.config'))
paths = [config_root / 'ngrok/ngrok.yml', home / '.ngrok2/ngrok.yml',
         home / 'Library/Application Support/ngrok/ngrok.yml']
for path in paths:
    try:
        if re.search(r'^\s*authtoken:\s*[\'"]?[^\s\'"#]+', path.read_text(), re.M):
            sys.exit(0)
    except OSError:
        pass
sys.exit(1)
PY
    then
        [[ -t 0 ]] || fail 'Configure NGROK_AUTHTOKEN ou execute em um terminal para informar o token.'
        read -r -s -p 'Token do ngrok (não será salvo): ' NGROK_AUTHTOKEN
        printf '\n'
        [[ -n "$NGROK_AUTHTOKEN" ]] || fail 'O token está vazio.'
        export NGROK_AUTHTOKEN
    fi
fi

# Falha antes de abrir o túnel se a porta já estiver ocupada.
python3 - "$port" <<'PY'
import socket, sys
try:
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', int(sys.argv[1])))
except OSError as error:
    print(f'Não foi possível usar a porta {sys.argv[1]}: {error}. '
          'Tente outra, por exemplo: ./deploy.sh 8081', file=sys.stderr)
    sys.exit(1)
PY

printf 'Iniciando LORDES em http://127.0.0.1:%s\n' "$port"
python3 "$project_dir/server.py" --port "$port" --bind 127.0.0.1 &
server_pid=$!

# Aguarda uma resposta HTTP antes de expor o servidor.
python3 - "$port" "$server_pid" <<'PY'
import os, sys, time, urllib.request
url = f'http://127.0.0.1:{sys.argv[1]}/'
for _ in range(50):
    try:
        os.kill(int(sys.argv[2]), 0)
        with urllib.request.urlopen(url, timeout=1) as response:
            if response.status == 200:
                sys.exit(0)
    except (OSError, ValueError):
        time.sleep(.1)
print('O servidor local não ficou disponível.', file=sys.stderr)
sys.exit(1)
PY
kill -0 "$server_pid" 2>/dev/null || fail 'O servidor local encerrou inesperadamente.'

printf '\nAbrindo ngrok. O link HTTPS aparece abaixo em "url=".\n'
printf 'Deixe este terminal aberto. Ctrl+C encerra o túnel e o servidor.\n\n'
ngrok http "http://127.0.0.1:$port" --log stdout --log-format logfmt &
tunnel_pid=$!
wait -n "$server_pid" "$tunnel_pid"
