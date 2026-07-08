FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt uvicorn

# Copy the rest of the application
COPY . .

# Expose the port the app runs on
EXPOSE 3001

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3001"]
