# # To run server, please run these commands:

# Create virtual environment
```bash
python -m venv .venv
```

# Access to virtual env
```bash
# In mac
source .venv/bin/activate
# In CMD
.venv/Scripts/activate.bat
# In Powershell
.venv/Scripts/Activate.ps1
```

# Install all necessary modules
```bash
pip install -r requirements.txt
```

# Run the server on port 8000
```bash
uvicorn main:app --host localhost --port 8000
```