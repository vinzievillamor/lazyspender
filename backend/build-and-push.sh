#!/bin/bash

# Build and Push to Google Container Registry
# Repository: us-east1-docker.pkg.dev/mindful-rhythm-426908-a5/lazyspender/lazyspender-api

set -e  # Exit on any error

# Fix for Git Bash on Windows - use .cmd versions of commands
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ -n "$MINGW_PREFIX" ]]; then
    GCLOUD_CMD="gcloud.cmd"
    DOCKER_CMD="docker.exe"
else
    GCLOUD_CMD="gcloud"
    DOCKER_CMD="docker"
fi

# Configuration
REGISTRY="us-east1-docker.pkg.dev"
PROJECT_ID="mindful-rhythm-426908-a5"
REPOSITORY="lazyspender"
IMAGE_NAME="lazyspender-api"
FULL_IMAGE_PATH="${REGISTRY}/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}"

# Get version tag (default to 'latest' if not provided)
VERSION_TAG="${1:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Navigate to backend directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo_info "Starting build and push process..."
echo_info "Image: ${FULL_IMAGE_PATH}:${VERSION_TAG}"

# Step 1: Authenticate with Google Cloud (if not already authenticated)
echo_info "Configuring Docker authentication for Google Artifact Registry..."
$GCLOUD_CMD auth configure-docker ${REGISTRY} --quiet

# Step 2: Build the Docker image
echo_info "Building Docker image..."
$DOCKER_CMD build -t "${FULL_IMAGE_PATH}:${VERSION_TAG}" .

# Also tag as latest if a specific version was provided
if [ "$VERSION_TAG" != "latest" ]; then
    echo_info "Tagging image as latest..."
    $DOCKER_CMD tag "${FULL_IMAGE_PATH}:${VERSION_TAG}" "${FULL_IMAGE_PATH}:latest"
fi

# Step 3: Push the Docker image
echo_info "Pushing image to Google Artifact Registry..."
$DOCKER_CMD push "${FULL_IMAGE_PATH}:${VERSION_TAG}"

if [ "$VERSION_TAG" != "latest" ]; then
    echo_info "Pushing latest tag..."
    $DOCKER_CMD push "${FULL_IMAGE_PATH}:latest"
fi

echo_info "Build and push completed successfully!"
echo_info "Image available at: ${FULL_IMAGE_PATH}:${VERSION_TAG}"
