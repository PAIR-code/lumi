# Lumi Firebase Cloud Functions

Defines cloud functions for Lumi backend.

(Make sure to create and activate a virtual env in this functions directory.)

To install dependencies:

```
pip install -r requirements.txt
```

To run emulator:

```
firebase emulators:start
```

To deploy functions:

```
firebase deploy --only functions
```

To run tests:

```
python3 -m unittest discover -p "*_test.py"
```

To test import locally:

```
python3 import_test_script [arxiv_id] [version]
```
