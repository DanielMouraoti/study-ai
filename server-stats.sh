#!/usr/bin/env bash
# server-stats.sh — Análise de estatísticas de desempenho do servidor Linux
# Uso: ./server-stats.sh

# ─────────────────────────── Cores ────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

separator() {
    echo -e "${CYAN}────────────────────────────────────────────────────────${RESET}"
}

header() {
    echo
    separator
    echo -e "${BOLD}${YELLOW}  $1${RESET}"
    separator
}

# ─────────────────────── Informações do Sistema ───────────────────────
header "🖥️  INFORMAÇÕES DO SISTEMA"

OS=$(grep -oP '(?<=^PRETTY_NAME=").*(?=")' /etc/os-release 2>/dev/null \
     || uname -o)
KERNEL=$(uname -r)
HOSTNAME=$(hostname)
UPTIME=$(uptime -p 2>/dev/null || uptime | awk -F',' '{print $1}' | awk '{$1=$2=""; print $0}' | xargs)
LOAD=$(uptime | awk -F'load average:' '{print $2}' | xargs)
LOGGED_USERS=$(who | wc -l)

echo -e "  ${BOLD}Hostname:${RESET}        $HOSTNAME"
echo -e "  ${BOLD}Sistema Operacional:${RESET} $OS"
echo -e "  ${BOLD}Kernel:${RESET}          $KERNEL"
echo -e "  ${BOLD}Uptime:${RESET}          $UPTIME"
echo -e "  ${BOLD}Média de Carga:${RESET}  $LOAD"
echo -e "  ${BOLD}Usuários Logados:${RESET} $LOGGED_USERS"

# ────────────────────────── Tentativas de Login Falhas ─────────────────
FAILED_LOGINS=0
if [ -f /var/log/auth.log ]; then
    FAILED_LOGINS=$(grep -c "Failed password" /var/log/auth.log 2>/dev/null)
    [ -z "$FAILED_LOGINS" ] && FAILED_LOGINS=0
elif [ -f /var/log/secure ]; then
    FAILED_LOGINS=$(grep -c "Failed password" /var/log/secure 2>/dev/null)
    [ -z "$FAILED_LOGINS" ] && FAILED_LOGINS=0
fi
echo -e "  ${BOLD}Logins Falhos:${RESET}   ${RED}$FAILED_LOGINS${RESET}"

# ────────────────────────── Uso Total da CPU ──────────────────────────
header "⚙️  USO TOTAL DA CPU"

# Captura idle% de duas leituras separadas para cálculo preciso
CPU_IDLE=$(top -bn2 | grep "Cpu(s)" | tail -1 | \
           awk '{for(i=1;i<=NF;i++) if($i~/id,/) print $(i-1)}')
# Fallback: usar /proc/stat
if [ -z "$CPU_IDLE" ]; then
    read -r cpu user nice system idle iowait irq softirq steal < <(head -1 /proc/stat)
    TOTAL1=$((user+nice+system+idle+iowait+irq+softirq+steal))
    IDLE1=$idle
    sleep 0.5
    read -r cpu user nice system idle iowait irq softirq steal < <(head -1 /proc/stat)
    TOTAL2=$((user+nice+system+idle+iowait+irq+softirq+steal))
    IDLE2=$idle
    DIFF_TOTAL=$((TOTAL2 - TOTAL1))
    DIFF_IDLE=$((IDLE2 - IDLE1))
    CPU_USED=$(awk "BEGIN {printf \"%.1f\", (1 - $DIFF_IDLE/$DIFF_TOTAL)*100}")
else
    CPU_USED=$(awk "BEGIN {printf \"%.1f\", 100 - $CPU_IDLE}")
fi

echo -e "  ${BOLD}CPU em uso:${RESET} ${RED}${CPU_USED}%${RESET}"

# ────────────────────────── Uso Total de Memória ──────────────────────
header "🧠  USO TOTAL DE MEMÓRIA"

MEM_INFO=$(free -m | grep "^Mem:")
MEM_TOTAL=$(echo "$MEM_INFO" | awk '{print $2}')
MEM_USED=$(echo  "$MEM_INFO" | awk '{print $3}')
MEM_FREE=$(echo  "$MEM_INFO" | awk '{print $4}')
MEM_PCT=$(awk "BEGIN {printf \"%.1f\", ($MEM_USED/$MEM_TOTAL)*100}")

echo -e "  ${BOLD}Total:${RESET}    ${MEM_TOTAL} MB"
echo -e "  ${BOLD}Usado:${RESET}    ${RED}${MEM_USED} MB  (${MEM_PCT}%)${RESET}"
echo -e "  ${BOLD}Livre:${RESET}    ${GREEN}${MEM_FREE} MB${RESET}"

# ────────────────────────── Uso Total do Disco ────────────────────────
header "💾  USO TOTAL DO DISCO (partição raiz /)"

DISK_INFO=$(df -h / | tail -1)
DISK_TOTAL=$(echo "$DISK_INFO" | awk '{print $2}')
DISK_USED=$(echo  "$DISK_INFO" | awk '{print $3}')
DISK_FREE=$(echo  "$DISK_INFO" | awk '{print $4}')
DISK_PCT=$(echo   "$DISK_INFO" | awk '{print $5}')

echo -e "  ${BOLD}Total:${RESET}    $DISK_TOTAL"
echo -e "  ${BOLD}Usado:${RESET}    ${RED}$DISK_USED  ($DISK_PCT)${RESET}"
echo -e "  ${BOLD}Livre:${RESET}    ${GREEN}$DISK_FREE${RESET}"

# ────────────────────── Top 5 Processos por CPU ───────────────────────
header "🔥  TOP 5 PROCESSOS POR USO DE CPU"

printf "  ${BOLD}%-8s %-10s %-8s %s${RESET}\n" "PID" "USUÁRIO" "CPU%" "COMANDO"
separator
ps aux --sort=-%cpu 2>/dev/null | awk 'NR>1 {printf "  %-8s %-10s %-8s %s\n", $2, $1, $3, $11}' | head -5

# ────────────────────── Top 5 Processos por Memória ──────────────────
header "💡  TOP 5 PROCESSOS POR USO DE MEMÓRIA"

printf "  ${BOLD}%-8s %-10s %-8s %s${RESET}\n" "PID" "USUÁRIO" "MEM%" "COMANDO"
separator
ps aux --sort=-%mem 2>/dev/null | awk 'NR>1 {printf "  %-8s %-10s %-8s %s\n", $2, $1, $4, $11}' | head -5

# ──────────────────────────────────────────────────────────────────────
separator
echo -e "  ${GREEN}✅  Análise concluída em $(date '+%d/%m/%Y %H:%M:%S')${RESET}"
separator
echo
