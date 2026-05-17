import type { Command } from "commander";

// In this template literal, only ${...} (brace-interpolations) are escaped as \${...}
// to prevent TypeScript from treating them as JS template expressions.
// Plain $VARNAME (no braces) requires no escaping.
const BASH_SCRIPT = `\
_remote_host_completion() {
  local cur prev command
  _init_completion 2>/dev/null || return

  # Top-level completion
  if [[ $COMP_CWORD -eq 1 ]]; then
    COMPREPLY=($(compgen -W "device ssh exec upload download config completion" -- "\${cur}"))
    return
  fi

  command="\${COMP_WORDS[1]}"

  # Filter out already-used options
  _filter_used_options() {
    local opts="$1"; shift
    local used=("$@")
    for u in "\${used[@]}"; do
      opts="\${opts//$u/}"
    done
    echo "$opts"
  }

  case "\${command}" in
    device)
      if [[ $COMP_CWORD -eq 2 ]]; then
        COMPREPLY=($(compgen -W "list add remove update" -- "\${cur}"))
        return
      fi
      local subcmd="\${COMP_WORDS[2]}"
      case "\${subcmd}" in
        list)
          local opts=$(_filter_used_options "--show-password" "\${COMP_WORDS[@]:3}")
          COMPREPLY=($(compgen -W "\${opts}" -- "\${cur}")) ;;
        add)
          local opts=$(_filter_used_options "--name --host --port --username --password --key-file" "\${COMP_WORDS[@]:3}")
          COMPREPLY=($(compgen -W "\${opts}" -- "\${cur}")) ;;
        update)
          local opts=$(_filter_used_options "--name --host --port --username --password --key-file --clear-password --clear-key-file" "\${COMP_WORDS[@]:3}")
          COMPREPLY=($(compgen -W "\${opts}" -- "\${cur}")) ;;
      esac ;;
    ssh)
      if [[ $COMP_CWORD -eq 2 ]]; then
        local devices
        devices=$(grep '^\s*name:' ~/.remote-ssh/devices.yaml 2>/dev/null | sed 's/^\s*name:\s*//')
        COMPREPLY=($(compgen -W "$devices" -- "\${cur}"))
      fi ;;
    exec)
      if [[ "\${prev}" == "-d" || "\${prev}" == "--device" ]]; then
        local devices
        devices=$(grep '^\s*name:' ~/.remote-ssh/devices.yaml 2>/dev/null | sed 's/^\s*name:\s*//')
        COMPREPLY=($(compgen -W "$devices" -- "\${cur}"))
      elif [[ $COMP_CWORD -eq 2 ]]; then
        local opts=$(_filter_used_options "-d --device" "\${COMP_WORDS[@]:2}")
        COMPREPLY=($(compgen -W "\${opts}" -- "\${cur}"))
      fi ;;
    upload)
      local opts=$(_filter_used_options "--recursive" "\${COMP_WORDS[@]:2}")
      COMPREPLY=($(compgen -W "\${opts}" -- "\${cur}")) ;;
    download)
      local opts=$(_filter_used_options "--recursive" "\${COMP_WORDS[@]:2}")
      COMPREPLY=($(compgen -W "\${opts}" -- "\${cur}")) ;;
    config)
      if [[ $COMP_CWORD -eq 2 ]]; then
        COMPREPLY=($(compgen -W "show set-token" -- "\${cur}"))
      fi ;;
    completion)
      COMPREPLY=($(compgen -W "bash" -- "\${cur}")) ;;
  esac
}
complete -F _remote_host_completion remote-host
`;

export function registerCompletion(program: Command): void {
  program
    .command("completion [shell]")
    .description("Output shell completion script (default: bash)")
    .action((shell?: string) => {
      const scripts: Record<string, string> = {
        bash: BASH_SCRIPT,
      };
      const target = shell ?? "bash";
      if (scripts[target]) {
        process.stdout.write(scripts[target]);
      } else {
        process.stderr.write(`Unsupported shell: ${target}\n`);
        process.exitCode = 1;
      }
    });
}
