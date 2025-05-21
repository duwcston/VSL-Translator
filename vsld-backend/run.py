"""
VSL Detection Backend Entry Point
This module serves as the entry point for the VSL Detection Backend application.
"""

import uvicorn
import os
import sys

# Add the parent directory to the Python path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

if __name__ == "__main__":
    uvicorn.run("app:app", host="localhost", port=8000, reload=True)
