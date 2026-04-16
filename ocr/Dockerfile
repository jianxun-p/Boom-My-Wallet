FROM debian:bookworm AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential git cmake libcurl4-openssl-dev ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# To trigger git clone
ADD https://api.github.com/repos/ggml-org/llama.cpp/git/refs/heads/master version.json

RUN git clone --depth 1 https://github.com/ggml-org/llama.cpp.git

WORKDIR /app/llama.cpp

# 1. Create a build directory
RUN cmake -B build -DGGML_NATIVE=ON -DBUILD_SHARED_LIBS=OFF

# 2. Compile the project
RUN cmake --build build --config Release -j $(nproc)



# Download stage
FROM python:alpine AS models

WORKDIR /models

# Use models that were downloaded manually in directory "models"
COPY models .

# Download Models from HuggingFace
# RUN python3 -m venv /opt/venv && \
#     /opt/venv/bin/pip install --no-cache-dir "huggingface_hub[cli]"

# RUN /opt/venv/bin/hf download --local-dir . unsloth/Qwen3.5-2B-GGUF \
#     Qwen3.5-2B-Q8_0.gguf

# RUN /opt/venv/bin/hf download --local-dir . unsloth/Qwen3.5-2B-GGUF \
#     mmproj-BF16.gguf

# Stage 3
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 libstdc++6 ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/llama.cpp/build/bin/llama-server .

WORKDIR /models
COPY --from=models /models .

# Expose the server port
EXPOSE 8080

ENTRYPOINT ["/app/llama-server"]
CMD [ \
    "--host", "0.0.0.0", "--port", "8080", \
    "-m", "/models/Qwen3.5-2B-UD-Q8_K_XL.gguf", \
    "--mmproj", "/models/mmproj-BF16.gguf", \
    "--ctx-size", "8192", \
    "--reasoning", "off" \
]
