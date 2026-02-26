# Pharmacy OCR Microservice (Mock)

This is a Python microservice designed to handle OCR (Optical Character Recognition) tasks for handwritten prescriptions.

## Overview

Currently, this service acts as a placeholder (Mock) implementation. It simulates processing a prescription image and returns structured JSON data representing the extracted medications, dosages, and instructions.

In a future iteration, this service will integrate with advanced Vision-Language Models (VLMs) or specialized OCR libraries (like PyTorch/Hugging Face Transformers) to perform actual handwriting recognition.

## Requirements

- Python 3.9+
- pip (Python package manager)

## Setup Instructions (Windows)

1.  **Navigate to the directory:**
    ```bash
    cd ocr-service
    ```

2.  **Create a virtual environment:**
    ```bash
    python -m venv venv
    ```

3.  **Activate the virtual environment:**
    ```bash
    .\venv\Scripts\activate
    ```

4.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

5.  **Run the server:**
    ```bash
    uvicorn main:app --reload --port 8000
    ```
    The server will start at `http://127.0.0.1:8000`.

## API Endpoints

-   `POST /api/parse`: Upload an image file (`multipart/form-data`) to receive parsed prescription data.
-   `GET /health`: Health check endpoint.
