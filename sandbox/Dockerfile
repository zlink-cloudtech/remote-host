FROM node:20-slim

ARG CN=0

# Step 1: install ca-certificates from original sources so HTTPS works
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Step 2: switch to CN mirrors (Debian apt + npm registry) when CN=1
RUN if [ "$CN" = "1" ]; then \
      if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
        sed -i 's|http://deb.debian.org/debian|https://mirrors.tuna.tsinghua.edu.cn/debian|g' \
          /etc/apt/sources.list.d/debian.sources; \
        sed -i 's|http://security.debian.org/debian-security|https://mirrors.tuna.tsinghua.edu.cn/debian-security|g' \
          /etc/apt/sources.list.d/debian.sources; \
      else \
        sed -i 's|http://deb.debian.org/debian|https://mirrors.tuna.tsinghua.edu.cn/debian|g' \
          /etc/apt/sources.list; \
        sed -i 's|http://security.debian.org/debian-security|https://mirrors.tuna.tsinghua.edu.cn/debian-security|g' \
          /etc/apt/sources.list; \
      fi; \
      npm config set registry https://registry.npmmirror.com; \
    fi

# Step 3: install remaining packages (uses CN mirror if configured)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       bash-completion curl \
       openssh-client sshpass \
    && rm -rf /var/lib/apt/lists/*

# Placeholder stubs — always present so COPY never fails (used by Kind extension)
COPY __kubectl_local /tmp/__kubectl_local
COPY __helm_local    /tmp/__helm_local
RUN rm -f /tmp/__kubectl_local /tmp/__helm_local

ARG TGZ_NAME
COPY ${TGZ_NAME} /tmp/remote-host.tgz
RUN npm install -g /tmp/remote-host.tgz && rm /tmp/remote-host.tgz

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /workspace
ENTRYPOINT ["/entrypoint.sh"]
