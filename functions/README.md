# Lumi Firebase Cloud Functions

Defines cloud functions for Lumi backend.

First, create and activate a virtual env in this functions directory.

To install dependencies:

```
pip install -r requirements.txt
```

Create an api_config.py file and add your API key (see TODOs in example file).

```
cp api_config.example.py api_config.py
```

To run emulator:

```
firebase emulators:start
```

To deploy functions:

```
firebase deploy --only functions
```

To run unittests:

```
python3 -m unittest discover -p "*_test.py"
```

To run the integration test:

```
FUNCTION_RUN_MODE=testing firebase emulators:exec 'python3 -m unittest discover -p "main_integration.py"'
```
