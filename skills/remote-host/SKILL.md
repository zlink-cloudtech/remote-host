---
name: remote-host
organization: zlink-cloudtech
description: 使用 remote-host CLI 通过 SSH 或 SCP 管理远程设备时使用，包括维护设备配置、打开 SSH 会话、执行远程命令、上传下载文件、查看或更新 remote-host 配置。
version: "0.1.6"
author: zlink-cloudtech
license: MIT
---

# remote-host 技能

`remote-host` 是一个 Node.js CLI 工具，封装了 `ssh` / `scp`，通过设备名或 ID 操作已注册的远程主机。

## Overview

优先把用户请求映射成这几类动作：维护设备清单、打开 SSH 会话、执行一次性命令、上传文件、下载文件、查看 CLI 配置。

当前实现有两类本地状态：

- 设备清单存储在 `~/.remote-ssh/devices.yaml`，权限 `600`，可通过 `REMOTE_SSH_DEVICES_DIR` 覆盖目录。
- CLI 配置存储在 `~/.remotehostrc.json`，权限 `600`，其中 `token` 可被环境变量 `REMOTE_HOST_TOKEN` 覆盖。

设备认证支持三种路径：

- `password`：明文密码，底层通过 `sshpass` 传给 `ssh` / `scp`。
- `keyFile`：SSH 私钥路径，直接传给 `-i` 参数。
- 未设置两者：走系统默认 SSH 认证链路，例如 agent 或默认密钥。

## When to Use

在这些场景使用 `remote-host`：

- 用户明确提到 `remote-host`、远程设备清单、设备别名、设备 ID。
- 需求是“按设备名连接/执行/上传/下载”，而不是手写完整 `ssh` / `scp` 命令。
- 需要维护本地设备配置，例如新增、更新、删除设备或切换认证方式。
- 需要查看或更新 CLI 配置，例如 `token`、shell completion、配置文件内容。

不要在这些场景优先使用它：

- 用户只要通用 SSH 概念解释，不需要实际执行 `remote-host` 命令。
- 目标机器尚未纳入设备清单，且用户明确要求直接给原生 `ssh` / `scp` 命令。

## Quick Reference

### CLI 配置

```bash
remote-host config set-token <token>
remote-host config show
remote-host completion bash
```

### 设备管理

```bash
remote-host device list
remote-host device list --show-password
remote-host device add
remote-host device add --name myserver --host 192.168.1.10 --port 22 \
  --username root --password secret
remote-host device add --name myserver --host 192.168.1.10 \
  --username root --key-file ~/.ssh/id_rsa
remote-host device update myserver --host 192.168.1.11 --port 2222
remote-host device update myserver --clear-password
remote-host device update myserver --clear-key-file
remote-host device remove myserver
```

### 连接、执行、传输

```bash
remote-host ssh myserver
remote-host exec -d myserver ls /var/log
remote-host exec -d myserver "df -h && free -m"
remote-host exec -d myserver systemctl status nginx
remote-host upload myserver ./app.tar.gz /opt/deploy/app.tar.gz
remote-host upload myserver ./dist /opt/app/dist -r
remote-host download myserver /var/log/app.log ./app.log
remote-host download myserver /opt/app/dist ./dist -r
```

## Core Pattern

先确认目标设备是否已注册，再决定动作类型：

1. 查看或确认设备：`remote-host device list`
2. 交互式连接：`remote-host ssh <device>`
3. 执行一次性命令：`remote-host exec -d <device> "<command>"`
4. 上传文件或目录：`remote-host upload <device> <local> <remote> [-r]`
5. 下载文件或目录：`remote-host download <device> <remote> <local> [-r]`

## Common Workflows

### 部署应用

```bash
tar -czf dist.tar.gz dist/
remote-host upload prod-server ./dist.tar.gz /opt/app/dist.tar.gz
remote-host exec -d prod-server "cd /opt/app && tar -xzf dist.tar.gz && systemctl restart myapp"
```

### 拉取日志

```bash
remote-host download myserver /var/log/app/error.log ./error.log
```

### 修正设备配置

```bash
remote-host device update prod-server --port 2222
remote-host device update prod-server --clear-password --key-file ~/.ssh/prod_rsa
```

## Common Mistakes

- `<device>` 可以是设备 `name` 或 8 位 hex `id`。
- `exec` 不接 `<device>` 位置参数，必须通过 `-d` 或 `--device` 指定目标设备。
- `config show` 显示的是 CLI 配置，不是设备清单；设备清单要用 `remote-host device list`。
- 首次连接未知主机时，密码认证模式会自动添加 known_hosts（`StrictHostKeyChecking=accept-new`），密钥模式沿用默认 `ssh` 行为。
- 密码认证依赖系统安装 `sshpass`；密钥认证只需要标准 `ssh` / `scp`。
- `~/.remotehostrc.json` 中的 `env` 字段会在 CLI 启动时注入进程环境，但不会覆盖系统中已存在的同名变量。
- 错误时设置 `process.exitCode = 1`，不使用 `process.exit()`；Ctrl+C 退出码为 `0`。
- 不存在的设备名会打印错误并以退出码 `1` 退出，不抛出异常。
