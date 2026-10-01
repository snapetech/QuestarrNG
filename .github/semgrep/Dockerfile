FROM semgrep/semgrep:1.178.0@sha256:32e459968daabe7ab86968184a29109b9564aa00392401156f9788452b42786b

USER root
COPY requirements/requirements.txt /tmp/semgrep-security-overrides.txt
RUN python -m pip install --break-system-packages --no-deps --only-binary=:all: --require-hashes \
      -r /tmp/semgrep-security-overrides.txt && \
    rm /tmp/semgrep-security-overrides.txt

USER 1000
WORKDIR /src
