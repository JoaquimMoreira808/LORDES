import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from server import SaveStore, SaveError, valid_state

def state():
    return {'version':1,'paused':False,'inventory':{'trigo':23},'areas':{'campo':{'id':'campo','definitionId':'campos-trigo'}},'citizens':{'1':{'id':1,'deckId':'povo-norte','bundleId':'norte-commonners','areaId':'campo','progress':{'colher-trigo':1.25}}}}

class SaveStoreTests(unittest.TestCase):
    def setUp(self):
        self.temporary=tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root=Path(self.temporary.name)
        self.store=SaveStore(self.root)

    def test_new_and_roundtrip(self):
        self.assertIsNone(self.store.load('Joaquim')['state'])
        saved=self.store.save('Joaquim',state(),0)
        self.assertEqual(saved['revision'],1)
        self.assertEqual(self.store.load('  JOAQUIM  ')['state'],state())
        self.assertEqual(len(list(self.root.glob('*.json'))),1)

    def test_different_names_isolated_and_accents_supported(self):
        self.store.save('João',state(),0)
        other=state();other['inventory']['trigo']=99
        self.store.save('Maria',other,0)
        self.assertEqual(self.store.load('João')['state']['inventory']['trigo'],23)
        self.assertEqual(self.store.load('Maria')['state']['inventory']['trigo'],99)

    def test_invalid_names_never_escape_save_directory(self):
        for name in ['../fora','/tmp/test','',None,'x'*41,'abc\nxyz','<script>']:
            with self.subTest(name=name),self.assertRaises(SaveError):self.store.save(name,state(),0)
        self.assertEqual(list(self.root.iterdir()),[])

    def test_concurrent_stale_revision_does_not_overwrite(self):
        self.store.save('Ana',state(),0)
        newer=state();newer['inventory']['trigo']=80
        self.store.save('Ana',newer,1)
        with self.assertRaises(SaveError) as result:self.store.save('Ana',state(),1)
        self.assertEqual(result.exception.status,409)
        self.assertEqual(self.store.load('Ana')['state']['inventory']['trigo'],80)

    def test_corrupt_save_is_preserved(self):
        _,path=self.store.path_for('Ana');path.write_text('{broken')
        with self.assertRaises(SaveError):self.store.load('Ana')
        with self.assertRaises(SaveError):self.store.save('Ana',state(),0)
        self.assertEqual(path.read_text(),'{broken')

    def test_failed_atomic_write_preserves_previous_file(self):
        self.store.save('Ana',state(),0)
        with patch('server.os.replace',side_effect=OSError('disk full')):
            with self.assertRaises(OSError):self.store.save('Ana',state(),1)
        self.assertEqual(self.store.load('Ana')['revision'],1)
        self.assertEqual(list(self.root.glob('*.tmp')),[])

    def test_invalid_state_is_rejected(self):
        changes=[lambda s:s.update(version=2),lambda s:s['inventory'].update(trigo=-1),lambda s:s['inventory'].update(trigo=1.5),lambda s:s['citizens']['1'].update(areaId='missing'),lambda s:s['citizens']['1']['progress'].update(bad=float('nan'))]
        for change in changes:
            saved=state();change(saved)
            with self.assertRaises(SaveError):valid_state(saved)

if __name__=='__main__':unittest.main()
