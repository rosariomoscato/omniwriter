#!/bin/bash

# ============================================================
# OmniWriter - Script di Archiviazione File Temporanei
# ============================================================
# Questo script sposta i file temporanei (check_*, test_*, verify_*,
# session-*, FEATURE*.md) in una cartella .archive organizzata.
#
# Uso: ./archive-temp-files.sh [--dry-run] [--restore]
#   --dry-run : Mostra cosa verrebbe fatto senza eseguire
#   --restore : Ripristina i file dall'archivio (non implementato)
# ============================================================

set -e

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directory base
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
ARCHIVE_DIR="$BASE_DIR/.archive"

# Flag per dry-run
DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo -e "${YELLOW}🔍 DRY-RUN MODE - Nessun file verrà spostato${NC}\n"
fi

# Crea struttura directory dell'archivio
create_archive_structure() {
    local dirs=(
        "check_scripts"
        "feature_docs"
        "session_logs"
        "test_scripts"
        "verify_scripts"
        "utility_scripts"
        "debug_logs"
        "temp_notes"
    )

    for dir in "${dirs[@]}"; do
        local full_path="$ARCHIVE_DIR/$dir"
        if [[ ! -d "$full_path" ]]; then
            if $DRY_RUN; then
                echo -e "${BLUE}[DRY]${NC} Creerei directory: $full_path"
            else
                mkdir -p "$full_path"
                echo -e "${GREEN}✓${NC} Creata directory: $full_path"
            fi
        fi
    done
}

# Funzione per spostare file con pattern
archive_pattern() {
    local pattern="$1"
    local dest_dir="$2"
    local description="$3"
    local exclude_node_modules="$4"

    echo -e "\n${BLUE}📁 $description${NC}"

    # Trova i file matching il pattern
    local files=()
    while IFS= read -r -d '' file; do
        # Esclude node_modules se richiesto
        if [[ "$exclude_node_modules" == "true" && "$file" == *"/node_modules/"* ]]; then
            continue
        fi
        files+=("$file")
    done < <(find "$BASE_DIR" -name "$pattern" -type f -print0 2>/dev/null | sort -z)

    if [[ ${#files[@]} -eq 0 ]]; then
        echo -e "   ${YELLOW}Nessun file trovato${NC}"
        return
    fi

    local dest_path="$ARCHIVE_DIR/$dest_dir"

    for file in "${files[@]}"; do
        local filename=$(basename "$file")
        local rel_dir=$(dirname "$file")
        rel_dir="${rel_dir#$BASE_DIR/}"
        # Se rel_dir è uguale a BASE_DIR, lascialo vuoto
        if [[ "$rel_dir" == "$BASE_DIR" ]]; then
            rel_dir=""
        fi

        local archive_subdir
        if [[ -z "$rel_dir" ]]; then
            archive_subdir="$dest_path"
        else
            archive_subdir="$dest_path/$rel_dir"
        fi

        if $DRY_RUN; then
            local display_path="${file#$BASE_DIR/}"
            local display_dest="$dest_dir"
            [[ -n "$rel_dir" ]] && display_dest="$dest_dir/$rel_dir"
            echo -e "   ${BLUE}[DRY]${NC} $display_path → .archive/$display_dest/"
        else
            # Crea sottodirectory mantenendo la struttura
            mkdir -p "$archive_subdir"
            mv "$file" "$archive_subdir/$filename"
            echo -e "   ${GREEN}✓${NC} $filename → .archive/$dest_dir/${rel_dir:+$rel_dir/}"
        fi
    done

    echo -e "   ${GREEN}Totale: ${#files[@]} file${NC}"
}

# Funzione principale
main() {
    echo -e "${GREEN}============================================================${NC}"
    echo -e "${GREEN}   OmniWriter - Archiviazione File Temporanei${NC}"
    echo -e "${GREEN}============================================================${NC}"

    # Crea struttura archivio
    create_archive_structure

    # Archive check_* files (exclude node_modules)
    archive_pattern "check_*" "check_scripts" "Script di verifica (check_*)" "true"

    # Archive FEATURE*.md files
    archive_pattern "FEATURE*.md" "feature_docs" "Documentazione Feature (FEATURE*.md)" "true"

    # Archive session-* files
    archive_pattern "session-*" "session_logs" "Log di sessione (session-*)" "true"

    # Archive test-* files (exclude node_modules)
    archive_pattern "test-*" "test_scripts" "Script di test (test-*)" "true"

    # Archive verify-* files (exclude node_modules)
    archive_pattern "verify-*" "verify_scripts" "Script di verifica (verify-*)" "true"

    # === SECONDO PASSAGGIO: Altri pattern temporanei ===

    # Archive create-* files (utility per creare utenti/test data)
    archive_pattern "create-*" "utility_scripts" "Script utility creazione (create-*)" "true"

    # Archive cleanup-* files
    archive_pattern "cleanup-*" "utility_scripts" "Script cleanup (cleanup-*)" "true"

    # Archive delete-* files
    archive_pattern "delete-*" "utility_scripts" "Script delete (delete-*)" "true"

    # Archive fix-* files
    archive_pattern "fix-*" "utility_scripts" "Script fix (fix-*)" "true"

    # Archive make-* files
    archive_pattern "make-*" "utility_scripts" "Script make (make-*)" "true"

    # Archive get-* files
    archive_pattern "get-*" "utility_scripts" "Script get utility (get-*)" "true"

    # Archive list-* files
    archive_pattern "list-*" "utility_scripts" "Script list (list-*)" "true"

    # Archive login-* files
    archive_pattern "login-*" "utility_scripts" "Script login test (login-*)" "true"

    # Archive quick-* files
    archive_pattern "quick-*" "utility_scripts" "Script quick check (quick-*)" "true"

    # Archive count-* files
    archive_pattern "count-*" "utility_scripts" "Script count (count-*)" "true"

    # Archive setup-* files
    archive_pattern "setup-*" "utility_scripts" "Script setup (setup-*)" "true"

    # Archive tmp-* files
    archive_pattern "tmp-*" "utility_scripts" "File temporanei (tmp-*)" "true"

    # Archive serve-* files
    archive_pattern "serve-*" "utility_scripts" "Script serve (serve-*)" "true"

    # Archive trace-* files
    archive_pattern "trace-*" "utility_scripts" "Script trace/debug (trace-*)" "true"

    # Archive validate-* files
    archive_pattern "validate-*" "utility_scripts" "Script validazione (validate-*)" "true"

    # Archive apply-* files
    archive_pattern "apply-*" "utility_scripts" "Script apply (apply-*)" "true"

    # Archive unlock-* files
    archive_pattern "unlock-*" "utility_scripts" "Script unlock (unlock-*)" "true"

    # Archive run-* files
    archive_pattern "run-*" "utility_scripts" "Script run-once (run-*)" "true"

    # Archive debug-* files
    archive_pattern "debug-*" "utility_scripts" "Script debug (debug-*)" "true"

    # Archive claude-progress files
    archive_pattern "claude-progress*" "debug_logs" "Log progresso Claude (claude-progress*)" "true"

    # Archive claude-session files
    archive_pattern "claude-session*" "debug_logs" "Log sessione Claude (claude-session*)" "true"

    # Archive console-* files
    archive_pattern "console-*" "debug_logs" "Log console error (console-*)" "true"

    # Archive feature*verification files
    archive_pattern "feature*verification*" "debug_logs" "Log verifica feature (feature*verification*)" "true"

    # Archive test_persistence* files (underscore variant)
    archive_pattern "test_persistence*" "test_scripts" "Script test persistenza (test_persistence*)" "true"

    # Archive test_user* files
    archive_pattern "test_user*" "test_scripts" "File test utente (test_user*)" "true"

    # Archive .persistence_test files
    archive_pattern ".persistence_test*" "debug_logs" "Log test persistenza (.persistence_test*)" "true"

    # Archive *STATUS.md files (analysis docs)
    archive_pattern "*STATUS.md" "temp_notes" "Note stato (*STATUS.md)" "true"

    # Archive *ANALYSIS.md files
    archive_pattern "*ANALYSIS.md" "temp_notes" "Note analisi (*ANALYSIS.md)" "true"

    # Archive *NOTES.md files
    archive_pattern "*NOTES.md" "temp_notes" "Note varie (*NOTES.md)" "true"

    # Archive *REGRESSION*.md files
    archive_pattern "*REGRESSION*.md" "temp_notes" "Note regression (*REGRESSION*.md)" "true"

    # Archive SESSION-*.md files
    archive_pattern "SESSION-*.md" "session_logs" "Log sessione (SESSION-*.md)" "true"

    # Archive feature-*-summary.md files
    archive_pattern "feature-*-summary.md" "feature_docs" "Summary feature (feature-*-summary.md)" "true"

    # Riepilogo finale
    echo -e "\n${GREEN}============================================================${NC}"
    echo -e "${GREEN}   Riepilogo Archiviazione${NC}"
    echo -e "${GREEN}============================================================${NC}"

    if $DRY_RUN; then
        echo -e "\n${YELLOW}Questo era un DRY-RUN. Per eseguire davvero:${NC}"
        echo -e "   ${BLUE}./archive-temp-files.sh${NC}\n"
    else
        # Conta file archiviati
        local total=$(find "$ARCHIVE_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')
        echo -e "\n${GREEN}✅ Archiviazione completata!${NC}"
        echo -e "   📦 Totale file archiviati: ${BLUE}$total${NC}"
        echo -e "   📁 Posizione archivio: ${BLUE}$ARCHIVE_DIR${NC}\n"

        # Crea un file di log dell'archiviazione
        local log_file="$ARCHIVE_DIR/ARCHIVE_LOG.md"
        echo "# Archive Log - $(date '+%Y-%m-%d %H:%M:%S')" > "$log_file"
        echo "" >> "$log_file"
        echo "## Struttura Directory" >> "$log_file"
        echo "\`\`\`" >> "$log_file"
        tree "$ARCHIVE_DIR" -L 2 2>/dev/null || find "$ARCHIVE_DIR" -type d | head -20 >> "$log_file"
        echo "\`\`\`" >> "$log_file"
        echo "" >> "$log_file"
        echo "## Statistiche" >> "$log_file"
        echo "- File totali: $total" >> "$log_file"
        echo "- Data archiviazione: $(date '+%Y-%m-%d %H:%M:%S')" >> "$log_file"

        echo -e "${GREEN}📝 Log salvato in: $log_file${NC}\n"
    fi
}

# Esegui
main
