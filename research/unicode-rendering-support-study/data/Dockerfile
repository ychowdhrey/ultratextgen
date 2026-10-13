# Container for the Unicode Rendering Support Study. Built and run on 2026-10-13: it installs the exact font package versions the study measured
# (the stock, minimal and Ubuntu-packaged conditions) and the Python pins in requirements.txt.
# Build: docker build -t utg-unicode-render <folder holding this file and requirements.txt>
# Run:   docker run --rm -v "$PWD/work:/study" utg-unicode-render bash -lc "cd /study/scripts && ./fetch_inputs.sh"   (see REPRODUCE.md)
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive LANG=en_US.UTF-8 LC_ALL=C.UTF-8
# Fonts: the exact Ubuntu 24.04 package versions measured in the study (condition A_stock / A_minimal / A_distro)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv git curl unzip ca-certificates nodejs xvfb fontconfig libnss3 libatk-bridge2.0-0 libgtk-3-0 libgbm1 libasound2t64 libxss1 \
    fonts-dejavu-core=2.37-8 fonts-liberation=1:2.1.5-3 fonts-freefont-ttf=20211204+svn4273-2 fonts-ipafont-gothic=00303-21ubuntu1 fonts-wqy-zenhei=0.9.45-8 \
    fonts-tlwg-loma-otf=1:0.7.3-1 fonts-crosextra-carlito=20230309-2 fonts-crosextra-caladea=20200211-2 fonts-opensymbol \
    fonts-noto-color-emoji=2.047-0ubuntu0.24.04.1 fonts-unifont=1:15.1.01-1build1 fonts-inter=4.0+ds-1 \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /study
COPY requirements.txt .
RUN python3 -m venv /venv && /venv/bin/pip install --no-cache-dir -r requirements.txt
ENV PATH=/venv/bin:$PATH
COPY . /study
# Ubuntu's own Noto packages for condition A_distro are fetched by scripts/fetch_inputs.sh at run time (apt-get download, versions pinned in RERUN.md).
CMD ["bash", "-lc", "echo 'see RERUN.md'"]
