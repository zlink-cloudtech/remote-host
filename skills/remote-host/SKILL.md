---
name: remote-host
description: >
  操作远程设备的技能，使用 remote-host CLI 工具连接、管理远程主机。适用场景：
  用户需要向远程设备上传文件、从远程设备下载文件、在远程设备执行命令、
  打开 SSH 交互会话、添加/删除/列出设备配置。
  触发词：remote-host、远程设备、上传文件到设备、从设备下载、在设备上执行、ssh 连接设备。
---

# remote-host 技能

`remote-host` 是一个 Node.js CLI 工具，封装了 ssh/scp 操作，通过设备名或 ID 引用已注册的远程主机。
设备配置持久化于 `~/.remote-ssh/devices.yaml`（权限 600）。

## 设备认证

设备支持两种认证方式（存储于设备配置）：

| 字段       | 说明                                         |
| ---------- | -------------------------------------------- |
| `password` | 明文密码，底层通过 `sshpass` 传递给 ssh/scp  |
| `keyFile`  | SSH 私钥文件路径，直接传给 `-i` 参数         |

---

## 常用命令速查

### 设备管理

```bash
# 列出所有已注册设备（隐藏密码）
remote-host device list

# 列出时显示明文密码
remote-host device list --show-password

# 交互式添加设备
remote-host device add

# 非交互式添加设备
remote-host device add --name myserver --host 192.168.1.10 --port 22 \
  --username root --password secret

# 使用密钥认证
remote-host device add --name myserver --host 192.168.1.10 \
  --username root --key-file ~/.ssh/id_rsa

# 删除设备（支持 name 或 id）
remote-host device remove myserver
```

### SSH 连接

```bash
# 打开交互式 SSH 会话
remote-host ssh myserver
```

### 执行远程命令

```bash
# 在设备上执行单条命令（-d 为必填项）
remote-host exec -d myserver ls /var/log

# 执行复杂命令（建议用引号包裹）
remote-host exec -d myserver "df -h && free -m"

# 查看服务状态
remote-host exec -d myserver systemctl status nginx
```

### 上传文件

```bash
# 上传单个文件
remote-host upload myserver ./app.tar.gz /opt/deploy/app.tar.gz

# 递归上传目录
remote-host upload myserver ./dist /opt/app/dist -r
```

### 下载文件

```bash
# 下载单个文件
remote-host download myserver /var/log/app.log ./app.log

# 递归下载目录
remote-host download myserver /opt/app/dist ./dist -r
```

---

## 常见工作流

### 部署应用

```bash
# 1. 构建产物打包
tar -czf dist.tar.gz dist/

# 2. 上传到目标设备
remote-host upload prod-server ./dist.tar.gz /opt/app/dist.tar.gz

# 3. 远程解压并重启服务
remote-host exec -d prod-server "cd /opt/app && tar -xzf dist.tar.gz && systemctl restart myapp"
```

### 拉取日志

```bash
remote-host download myserver /var/log/app/error.log ./error.log
```

---

## 注意事项

- `<device>` 参数接受设备的 `name` 或 `id`（8 位 hex）
- 首次连接未知主机时，密码认证模式自动添加 known_hosts（`StrictHostKeyChecking=accept-new`），密钥模式沿用 ssh 默认行为
- 密码认证需要系统安装 `sshpass`；密钥认证只需标准 `ssh`/`scp`
- 错误时设置 `process.exitCode = 1`，不使用 `process.exit()`；Ctrl+C 退出码为 0
- 不存在的设备名会打印错误并以退出码 1 退出，不抛出异常
