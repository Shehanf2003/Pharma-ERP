from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Pharmacy OCR Service", description="AI-powered prescription parser", version="1.0.0")

# Allow CORS for development (allowing frontend requests if needed directly, though backend proxies it)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend/backend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/parse")
async def parse_prescription(file: UploadFile = File(...)):
    """
    Analyzes an uploaded prescription image and extracts medication details.

    This is currently a MOCK implementation.
    In a production environment, this function would:
    1. Load the image using PIL or OpenCV.
    2. Pass the image to a Vision-Language Model (e.g., GPT-4o, Claude 3.5 Sonnet, or a fine-tuned Hugging Face model).
    3. The model would return structured JSON data.

    Example integration with Hugging Face (future implementation):

    ```python
    from transformers import TrOCRProcessor, VisionEncoderDecoderModel
    from PIL import Image

    processor = TrOCRProcessor.from_pretrained('microsoft/trocr-base-handwritten')
    model = VisionEncoderDecoderModel.from_pretrained('microsoft/trocr-base-handwritten')

    image = Image.open(file.file).convert("RGB")
    pixel_values = processor(images=image, return_tensors="pt").pixel_values
    generated_ids = model.generate(pixel_values)
    generated_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
    # Then parse `generated_text` into JSON
    ```
    """

    start_time = time.time()
    logger.info(f"Received file: {file.filename}")

    # Simulate processing delay for realism
    time.sleep(1.5)

    # Mock Response Data
    # In a real scenario, this data comes from the AI model based on the specific image content.
    mock_response = {
        "status": "success",
        "medications": [
            {
                "name": "Amoxicillin",
                "strength": "500mg",
                "quantity": 15,
                "frequency": "Twice daily",
                "timing": "After meals",
                "duration": "7 days"
            },
            {
                "name": "Paracetamol",
                "strength": "500mg",
                "quantity": 10,
                "frequency": "As needed",
                "timing": "After meals",
                "duration": "3 days"
            },
            {
                "name": "Vitamin C",
                "strength": "100mg",
                "quantity": 30,
                "frequency": "Once daily",
                "timing": "Morning",
                "duration": "30 days"
            }
        ],
        "extracted_text": "Amoxicillin 500mg BD x 7 days\nParacetamol 500mg PRN for fever\nVit C 100mg OD",
        "confidence_score": 0.92
    }

    logger.info(f"Processing completed in {time.time() - start_time:.2f}s")
    return mock_response

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "ocr-service"}

if __name__ == "__main__":
    import uvicorn
    # Host 0.0.0.0 allows access from other containers/machines if needed
    uvicorn.run(app, host="0.0.0.0", port=8000)
