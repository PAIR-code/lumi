# Lumi Firebase Cloud Functions

Defines cloud functions for Lumi backend.

## Set-up

1. Make sure to be in the functions directory:

```
cd functions
```

2. Create and activate a virtual env in this functions directory:

```
python3 -m venv venv
source venv/bin/activate
```

3. To install dependencies:

```
pip install -r requirements.txt
```

4. Create an api_config.py file and add your API key (see TODOs in example file).

```
cp models/api_config.example.py models/api_config.py
```

## Running locally

To run the local emulator:

```
firebase emulators:start
```

## Deployment

To deploy functions:

```
firebase deploy --only functions
```

## Testing

To run unittests:

```
python3 -m unittest discover -p "*_test.py"
```

To run the integration test:

```
FUNCTION_RUN_MODE=testing firebase emulators:exec 'python3 -m unittest discover -p "main_integration.py"'
```
