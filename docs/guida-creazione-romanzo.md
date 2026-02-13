# 📖 Guida Completa: Creare un Romanzo con OmniWriter

Questa guida descrive passo per passo come creare un romanzo dalla A alla Z usando OmniWriter.

---

## FASE 1: Creazione del Progetto

### Cosa fare:
1. Vai su **`/new-project`** (cliccando "Nuovo Progetto" dalla dashboard)
2. Seleziona l'area **"Romanziere"** (icona libro, colore ambra)

### Cosa compilare:

| Campo | Descrizione | Esempio |
|-------|-------------|---------|
| **Titolo** | Nome del romanzo | "L'Ombra del Destino" |
| **Descrizione** | Sinossi breve | "Un giovane scopre di avere poteri magici..." |
| **Genere** | Tipo di storia | `fantasy`, `romance`, `thriller`, `mystery` |
| **Tono** | Atteggiamento narrativo | `serio`, `leggero`, `dark`, `avventuroso` |
| **POV** | Punto di vista | `first_person` o `third_person_limited` |
| **Target Audience** | Pubblico | "Young Adult" |
| **Word Count Target** | Lunghezza obiettivo | 80,000 parole |

### Perché:
Questi parametri determinano:
- **La struttura dell'outline** (ogni genere ha un template diverso)
- **Lo stile di generazione AI**
- **Il numero di capitoli** (calcolato automaticamente: ~3000 parole/capitolo)

---

## FASE 2: Configurazione Parametri Romanzo

Dopo aver creato il progetto, puoi configurare parametri aggiuntivi:

### Parametri Narrativi

| Parametro | Opzioni | Impatto |
|-----------|---------|---------|
| **Genere** | `fantasy`, `romance`, `thriller`, `mystery`, `scifi`, `horror` | Determina la struttura dell'outline |
| **Tono** | `serio`, `leggero`, `dark`, `avventuroso`, `comico` | Influenza lo stile di scrittura AI |
| **POV** | `first_person`, `third_person_limited`, `third_person_omniscient` | Punto di vista narrativo |
| **Target Audience** | `children`, `young_adult`, `adult`, `all_ages` | Complessità del linguaggio |
| **Lunghezza** | 20,000 - 150,000 parole | Numero di capitoli (3000 parole/capitolo) |

### Come Modificare
1. Vai alla pagina del progetto (`/projects/:id`)
2. Clicca su **"Modifica"** o **"Impostazioni"**
3. Aggiorna i parametri desiderati
4. Salva le modifiche

---

## FASE 3: Human Model (Stile Personale)

### Cos'è il Human Model?
Il Human Model permette all'AI di **imparare il tuo stile di scrittura** da testi che hai scritto, replicando:
- Tono e voce narrativa
- Struttura delle frasi
- Vocabolario preferito
- Patterns stilistici ricorrenti

### Come Usarlo

#### A. Accedi alla Pagina Human Model
Vai su **`/human-model`** dalla sidebar o dal menu

#### B. Crea un Nuovo Profilo
1. Clicca **"Nuovo Profilo"**
2. Dai un nome al profilo (es. "Il mio stile fantasy")
3. Seleziona il tipo: **Romanziere Advanced** (per analisi profonda)

#### C. Carica i Tuoi Testi
Formati supportati: **PDF, DOCX, TXT, RTF**

> ⚠️ **Requisito minimo**: 50,000 parole per un'analisi accurata

#### D. Avvia l'Analisi
Clicca **"Analizza"** e attendi l'elaborazione

#### E. Applica al Progetto
1. Vai alla pagina del progetto
2. Seleziona il profilo Human Model dalle impostazioni
3. Imposta la **forza dello stile** (0-100%)
   - 0% = Nessuna influenza
   - 50% = Bilanciato
   - 100% = Replica totale del tuo stile

### Risultati dell'Analisi
Il sistema mostra:
- **Tono rilevato**: (es. "Introspectivo con momenti di azione")
- **Struttura frasi**: (es. "Frasi medie-lunghe, subordinate frequenti")
- **Vocabolario**: (es. "Lessico ricco, termini specifici del genere")
- **Patterns**: (es. "Uso frequente di metafore, dialoghi brevi")

---

## FASE 4: Fonti e Ricerca

### A. Caricare Fonti (Upload)
Vai su **`/projects/:id/sources`** o clicca **"Fonti"** nel progetto

**Formati supportati:**
- PDF (documenti, ebook)
- DOCX (Word)
- RTF (Rich Text)
- TXT (testo semplice)

**Perché caricare fonti:**
- L'AI attinge informazioni contestuali
- Mantiene coerenza con il mondo creato
- Cita riferimenti accurati

### B. Ricerca Web
1. Clicca **"Ricerca Web"** nella sezione fonti
2. Inserisci la query di ricerca
3. Salva i risultati rilevanti come fonti

### C. Gestione Fonti
- **Tagga** le fonti per categoria (es. "Storia", "Personaggi", "Luoghi")
- **Indica rilevanza** per ogni fonte
- **Elimina** fonti non più necessarie

### D. Creare Personaggi
Vai su **`/projects/:id`** → sezione **"Personaggi"**

**Cosa compilare per ogni personaggio:**

| Campo | Esempio |
|-------|---------|
| Nome | "Elena Blackwood" |
| Descrizione | "Giovane donna con capelli corvini e occhi viola" |
| Tratti | "Coraggiosa, impulsiva, leale" |
| Backstory | "Orfana cresciuta dalle streghe del bosco" |
| Ruolo | "Protagonista" |
| Relazioni | "Migliore amica di Marcus, nemica di Lord Vektor" |

**Perché:** L'AI userà queste informazioni per:
- Mantenere coerenza nei dialoghi
- Rispettare personalità e motivazioni
- Evitare contraddizioni

### E. Definire Luoghi
Vai su **`/projects/:id`** → sezione **"Luoghi"**

**Esempio:**
- Nome: "Accademia della Magia Oscura"
- Descrizione: "Castello medievale in cima a una montagna..."
- Rilevanza: "Luogo principale degli eventi"

### F. Eventi di Trama
Vai su **`/projects/:id`** → sezione **"Eventi"**

**Esempio:**
- Titolo: "Il Risveglio dei Poteri"
- Descrizione: "Elena scopre di poter controllare il fuoco"
- Capitolo collegato: Capitolo 3

---

## FASE 5: Struttura Narrativa (Outline)

### Cosa fare:
1. Vai alla pagina del progetto (`/projects/:id`)
2. Clicca **"Genera Outline"** nella sezione capitoli

### Cosa succede:
Il sistema genera automaticamente **10-30 capitoli** basati sul genere:

### Esempio per FANTASY:
```
1. The Awakening (3000 parole) - Elena scopre i suoi poteri
2. The Call to Adventure - Un mistero la spinge all'azione
3. Crossing the Threshold - Lascia casa per la prima volta
4. The First Trial - Affronta la prima prova
5. Allies and Enemies - Incontra personaggi chiave
6. The Dark Forest - Il viaggio diventa pericoloso
7. The Revelation - Una verità sconvolgente
8. The Loss - Un sacrificio necessario
9. The Final Stand - Lo scontro finale
10. Resolution - Conclusione e nuovo equilibrio
```

### Esempio per THRILLER:
```
1. The Crime - Viene commesso un omicidio
2. The Investigation Begins - Il detective arriva
3. First Clues - Prime scoperte
4. The Red Herring - Una falsa pista
5. The Stakes Rise - La tensione aumenta
6. A Close Call - Quasi catturato
7. The Twist - Rivelazione inaspettata
8. The Trap - Tende una trappola
9. Confrontation - Scontro con l'assassino
10. Justice - Giustizia fatta
```

### Esempio per ROMANCE:
```
1. The Encounter - I protagonisti si incontrano
2. First Impressions - Prime impressioni
3. Growing Closer - Si avvicinano
4. The Obstacle - Un ostacolo si frappone
5. Misunderstandings - Malintesi
6. The Rival - Un rivale appare
7. The Heartbreak - Rottura dolorosa
8. Realization - Comprensione dei sentimenti
9. The Grand Gesture - Gesto romantico decisivo
10. Happily Ever After - Finale felice
```

### Esempio per MYSTERY:
```
1. The Discovery - Scoperta del mistero
2. Gathering Evidence - Raccogliere prove
3. Interviewing Witnesses - Interrogare testimoni
4. Secrets Revealed - Segreti rivelati
5. The Second Body - Un'altra vittima
6. Connecting the Dots - Collegare gli indizi
7. The Accusation - L'accusa
8. The Alibi - L'alibi
9. The Truth - La verità
10. Case Closed - Caso chiuso
```

### Esempio DEFAULT (generico):
```
1. Introduction - Presentazione
2. Inciting Incident - Evento scatenante
3. Rising Action - Azione crescente
4. First Plot Point - Primo punto di svolta
5. The Journey - Il viaggio
6. The Midpoint - Punto medio
7. Complications - Complicazioni
8. The Climax - Il climax
9. Falling Action - Azione discendente
10. Resolution - Risoluzione
```

### Perché:
L'outline ti dà una **roadmap narrativa** coerente con le convenzioni del genere.

---

## FASE 6: Generazione AI

### Per ogni capitolo:

#### A. Apri l'Editor
1. Vai alla pagina del progetto (`/projects/:id`)
2. Clicca sul capitolo che vuoi generare
3. Si aprirà l'editor (`/projects/:id/chapters/:chapterId`)

#### B. Genera con AI
Hai due opzioni:

| Opzione | Descrizione |
|---------|-------------|
| **Generazione Standard** | L'AI scrive basandosi sui parametri del progetto |
| **Con Human Model** | L'AI replica il tuo stile personale |

**Il processo:**
1. L'AI legge il summary del capitolo
2. Consulta personaggi, luoghi, eventi correlati
3. Attinge dalle fonti caricate
4. Genera il testo in **streaming in tempo reale**

#### C. Monitora la Generazione
- **Indicatore di progresso** mostra la fase corrente
- **Fasi visibili**: Struttura → Scrittura → Revisione
- Puoi **annullare** in qualsiasi momento

#### D. Rigenerazione
Se non sei soddisfatto:
1. Clicca **"Rigenera"**
2. Il testo precedente viene salvato nella cronologia
3. Puoi sempre tornare indietro

---

## FASE 7: Revisione e Modifica

### A. Editor Integrato
L'editor offre strumenti completi:
- **Auto-save** ogni 30 secondi
- **Cronologia versioni** (puoi tornare indietro)
- **Find & Replace** per modifiche rapide
- **Undo/Redo** illimitato
- **Modalità full-screen** per scrivere senza distrazioni

### B. Tools di Qualità AI
- **Dialogue Enhancement**: Seleziona un dialogo e clicca per migliorarlo
- **Plot Hole Detection**: Analizza il testo per trovare buchi nella trama
- **Consistency Check**: Verifica coerenza con altri capitoli

### C. Analisi e Rifinitura

#### Plot Hole Detection
Il sistema cerca:
- Personaggi che scompaiono senza spiegazione
- Eventi non giustificati
- Contraddizioni temporali
- Motivazioni mancanti

#### Consistency Check
Verifica:
- Coerenza descrizioni personaggi
- Continuità temporale
- Riferimenti a luoghi corretti

---

## FASE 8: Export

### Come Esportare
1. Vai alla pagina del progetto (`/projects/:id`)
2. Clicca **"Export"** o **"Esporta"**
3. Seleziona il formato desiderato
4. Configura le opzioni (se disponibili)
5. Clicca **"Scarica"**

### Formati disponibili:

| Formato | Free | Premium | Descrizione |
|---------|------|---------|-------------|
| TXT | ✅ | ✅ | Testo semplice |
| DOCX | ✅ | ✅ | Microsoft Word |
| EPUB | ❌ | ✅ | Ebook con copertina e metadata |
| PDF | ❌ | ✅ | Documento stampabile |
| RTF | ❌ | ✅ | Rich Text Format |

### Opzioni EPUB (Premium)
- **Copertina**: Carica un'immagine personalizzata
- **Metadata**: Titolo, autore, ISBN, descrizione
- **Indice**: Generato automaticamente

---

## 🎯 Esempio Pratico Completo

### Voglio scrivere: "L'Ombra del Destino"

#### FASE 1: Creo il progetto
```
Area: Romanziere
Titolo: L'Ombra del Destino
Descrizione: Elena, una ragazza orfana, scopre di possedere
            poteri magici ereditati da un'antica stirpe.
Genere: fantasy
Tono: dark
POV: third_person_limited
Target: Young Adult
Word Count: 80,000
```

#### FASE 2: Configuro i parametri
```
Genere: fantasy (determina struttura outline)
Tono: dark (influenza stile AI)
POV: third_person_limited
Target Audience: young_adult
```

#### FASE 3: Creo il Human Model (opzionale)
```
1. Vado su /human-model
2. Creo profilo "Mio stile dark fantasy"
3. Carico 60,000 parole di mie opere precedenti
4. Avvio analisi
5. Imposto forza stile al 70%
```

#### FASE 4: Carico fonti e creo elementi
```
FONTI:
- "Storia della magia nel medioevo.pdf"
- Ricerca web: "mitologia celtica"

PERSONAGGI:
ELENA BLACKWOOD
- Protagonista, 18 anni
- Capelli neri, occhi viola
- Poteri: controllo del fuoco
- Tratti: coraggiosa, impulsiva

MARCUS STONE
- Alleato, 20 anni
- Guerriero con spada magica
- Tratti: leale, silenzioso

LORD VEKTOR
- Antagonista
- Stregone oscuro
- Vuole i poteri di Elena

LUOGHI:
- Accademia della Magia Oscura (castello sulla montagna)
- Villaggio di Elena (paesello rurale)
```

#### FASE 5: Genero l'outline
```
→ 10 capitoli generati automaticamente
→ Ogni capitolo ha titolo e summary
→ Struttura coerente col genere fantasy
```

#### FASE 6: Genero i capitoli
```
Per ogni capitolo:
1. Apro il capitolo nell'editor
2. Clicco "Genera" (con Human Model attivo)
3. Monitoro lo streaming in tempo reale
4. Leggo il risultato
5. Rigenero se necessario
```

#### FASE 7: Revisiono e rifinisco
```
- Leggo tutto il testo generato
- Modifico parti che non mi piacciono
- Uso "Dialogue Enhancement" sui dialoghi
- Eseguo "Plot Hole Detection"
- Correggo i problemi trovati
- Eseguo "Consistency Check"
- Salvo la versione finale
```

#### FASE 8: Export
```
Esporto in DOCX per revisione finale
Oppure in EPUB con copertina personalizzata (Premium)
```

---

## 📊 Riepilogo Architettura

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                           │
├──────────────────────────────────────────────────────────────────┤
│  NewProject.tsx     → Creazione progetto                          │
│  ProjectDetail.tsx  → Dashboard progetto (capitoli, fonti, etc.) │
│  ChapterEditor.tsx  → Editor con AI tools                        │
├──────────────────────────────────────────────────────────────────┤
│                        BACKEND (Express.js)                       │
├──────────────────────────────────────────────────────────────────┤
│  /api/projects      → CRUD progetti + outline generation         │
│  /api/chapters      → CRUD capitoli + AI generation              │
│  /api/ai            → Modelli disponibili                        │
│  /api/characters    → Gestione personaggi                        │
│  /api/locations     → Gestione luoghi                            │
│  /api/plot-events   → Gestione eventi trama                      │
│  /api/sources       → Gestione fonti                             │
├──────────────────────────────────────────────────────────────────┤
│                        DATABASE (SQLite)                          │
├──────────────────────────────────────────────────────────────────┤
│  projects → chapters → chapter_versions                           │
│           → characters → relationships                           │
│           → locations                                            │
│           → plot_events                                          │
│           → sources                                              │
│           → generation_logs (tracking token usage)               │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Stati dei Capitoli

Durante il workflow, ogni capitolo passa attraverso questi stati:

| Stato | Descrizione |
|-------|-------------|
| `draft` | Bozza iniziale, non ancora generato |
| `generated` | Generato dall'AI, non ancora revisionato |
| `revised` | Revisionato dall'utente |
| `final` | Versione finale, pronto per l'export |

---

## 🤖 Modelli AI Disponibili

| Provider | Modelli |
|----------|---------|
| OpenAI | `gpt-4-turbo`, `gpt-4`, `gpt-3.5-turbo` |
| Anthropic | `claude-3-opus`, `claude-3-sonnet`, `claude-3-haiku` |

---

## 💡 Consigli Utili

1. **Inizia con un buon outline** - Risparmia tempo e garantisce coerenza
2. **Crea i personaggi prima di generare** - L'AI li userà correttamente
3. **Usa il Human Model** - Per mantenere il tuo stile personale
4. **Controlla i plot holes** - Prima dell'export finale
5. **Salva versioni intermedie** - La cronologia è tua amica

---

*Guida generata per OmniWriter - La piattaforma di scrittura professionale basata su AI*
