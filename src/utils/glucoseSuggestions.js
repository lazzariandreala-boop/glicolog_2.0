/**
 * Glucose suggestion logic — informational only, no medical advice.
 * All outputs are general trend-based hints, not clinical guidance.
 */

// Percentage multipliers to apply to food bolus based on trend direction
export const TREND_FACTORS = {
  '⬆': 1.20, // steep rise  → +20%
  '↗': 1.10, // moderate rise → +10%
  '→': 1.00, // flat → no change
  '↘': 0.90, // moderate drop → −10%
  '⬇': 0.80, // steep drop → −20%
}

export function trendFactor(trend) {
  return TREND_FACTORS[trend] ?? 1.00
}

export function trendDir(trend) {
  if (trend === '⬆') return 'steep-up'
  if (trend === '↗') return 'up'
  if (trend === '→') return 'flat'
  if (trend === '↘') return 'down'
  if (trend === '⬇') return 'steep-down'
  return 'flat'
}

/**
 * Suggestion for standalone glucose reading (no meal context).
 * Returns { type: 'warn'|'info', msg: string } or null.
 */
export function glucoseOnlySuggestion(glic, trend, cfg) {
  if (!glic) return null
  const { targetMin = 80, targetMax = 180 } = cfg
  const dir = trendDir(trend)

  if (glic < 70) return null // handled by the existing hypo alert

  if (glic < targetMin) {
    if (dir === 'down' || dir === 'steep-down') {
      return {
        type: 'warn',
        msg: `Glicemia sotto il target (${glic} mg/dL) e in discesa: considera di assumere una piccola quantità di carboidrati rapidi (es. succo, zucchero) per prevenire un calo ulteriore.`,
      }
    }
    return {
      type: 'warn',
      msg: `Glicemia sotto il target (${glic} mg/dL): valuta se assumere una piccola quota di carboidrati per riportarla nel range.`,
    }
  }

  if (glic <= targetMax) {
    if (dir === 'steep-down') {
      return {
        type: 'warn',
        msg: `Glicemia ${glic} mg/dL ma in discesa rapida: rischio di uscire dal range. Considera uno spuntino preventivo con carboidrati rapidi.`,
      }
    }
    if (dir === 'down') {
      return {
        type: 'info',
        msg: `Glicemia ${glic} mg/dL nel range ma in discesa: monitora l'andamento. Se il calo dovesse continuare, valuta un piccolo spuntino.`,
      }
    }
    if (dir === 'steep-up' || dir === 'up') {
      return {
        type: 'info',
        msg: `Glicemia ${glic} mg/dL nel range ma in salita: monitora nelle prossime rilevazioni per verificare che non superi il target.`,
      }
    }
    return null
  }

  // glic > targetMax
  if (dir === 'steep-up' || dir === 'up') {
    return {
      type: 'warn',
      msg: `Glicemia ${glic} mg/dL (sopra target) e in ulteriore salita: l'andamento merita attenzione. Valuta con il tuo professionista.`,
    }
  }
  if (dir === 'steep-down' || dir === 'down') {
    return {
      type: 'info',
      msg: `Glicemia ${glic} mg/dL (sopra target) ma in discesa: il trend è favorevole. Continua a monitorare.`,
    }
  }
  return null
}

/**
 * Suggestion for PanelGlicemia when the reading is in a sport context.
 * Returns { type: 'warn'|'info', msg: string } or null.
 */
export function sportGlicSuggestion(glic, trend, timing, sportType, cfg) {
  if (!glic || !timing || !sportType) return null
  const { targetMin = 80, targetMax = 180, fsi } = cfg
  const dir = trendDir(trend)

  if (timing === 'before' && sportType === 'aerobico') {
    if (glic < 70) return null // hypo alert handles this
    if (glic <= 140) {
      return {
        type: 'warn',
        msg: `Glicemia di ${glic} mg/dL prima di sport aerobico: è consigliabile assumere una piccola quota di carboidrati rapidi (es. frutta, succo) per mantenere un livello adeguato durante l'esercizio e prevenire un calo.`,
      }
    }
    if (glic > targetMax && fsi) {
      const normalCorr = Math.max(0.5, Math.round(((glic - targetMin) / fsi) * 2) / 2)
      const reducedCorr = Math.max(0.5, Math.round(normalCorr * 0.5 * 2) / 2)
      return {
        type: 'info',
        msg: `Glicemia elevata (${glic} mg/dL) prima di sport aerobico: l'attività tenderà ad abbassarla. Correzione normale ~${normalCorr}U → considera ~${reducedCorr}U (circa −50%) per evitare un calo durante l'esercizio. Valuta sempre con il tuo professionista.`,
      }
    }
    if (glic > targetMax) {
      return {
        type: 'info',
        msg: `Glicemia elevata (${glic} mg/dL) prima di sport aerobico: considera di ridurre la correzione del 40–50% rispetto al normale, perché l'attività fisica contribuirà ad abbassarla.`,
      }
    }
    if (dir === 'down' || dir === 'steep-down') {
      return {
        type: 'warn',
        msg: `Glicemia ${glic} mg/dL e in discesa prima dello sport aerobico: considera una piccola quota di carboidrati preventivi per evitare un calo durante l'esercizio.`,
      }
    }
    return null
  }

  if (timing === 'before' && sportType === 'anaerobico') {
    if (glic > targetMax) {
      return {
        type: 'warn',
        msg: `Glicemia elevata (${glic} mg/dL) prima di attività anaerobica (pesi/HIIT): questo tipo di esercizio può aumentare ulteriormente la glicemia per effetto ormonale. Valuta con cautela prima di correggere.`,
      }
    }
    if (dir === 'up' || dir === 'steep-up') {
      return {
        type: 'info',
        msg: `Glicemia ${glic} mg/dL in salita prima di attività anaerobica: i pesi e il HIIT possono amplificare l'aumento per effetto delle catecolamine. Monitora dopo l'allenamento.`,
      }
    }
    return {
      type: 'info',
      msg: `L'attività anaerobica (pesi, HIIT) può causare un temporaneo aumento della glicemia per effetto dello stress ormonale. Monitora nella fase di recupero.`,
    }
  }

  if (timing === 'after' && sportType === 'aerobico') {
    if (glic < targetMin) {
      return {
        type: 'warn',
        msg: `Glicemia bassa (${glic} mg/dL) dopo sport aerobico: assumi carboidrati rapidi per riportarla nel range. L'effetto ipoglicemizzante dell'esercizio può continuare nelle ore successive.`,
      }
    }
    if (dir === 'steep-down' || dir === 'down') {
      return {
        type: 'warn',
        msg: `Glicemia ${glic} mg/dL in discesa dopo sport aerobico: l'effetto ipoglicemizzante può proseguire. Considera uno spuntino preventivo per evitare un calo tardivo.`,
      }
    }
    if (glic > targetMax) {
      return {
        type: 'info',
        msg: `Glicemia alta (${glic} mg/dL) dopo sport aerobico: può essere una risposta allo stress fisico o all'adrenalina. Monitora nelle prossime ore prima di correggere.`,
      }
    }
    return null
  }

  if (timing === 'after' && sportType === 'anaerobico') {
    if (glic > targetMax) {
      return {
        type: 'info',
        msg: `Glicemia alta (${glic} mg/dL) dopo attività anaerobica: risposta fisiologica frequente al rilascio di adrenalina durante lo sforzo. Non è necessariamente una vera iperglicemia — monitora nel tempo prima di correggere.`,
      }
    }
    if (dir === 'steep-down' || dir === 'down') {
      return {
        type: 'warn',
        msg: `Glicemia in calo dopo attività anaerobica: un calo tardivo è possibile anche con i pesi. Tieni sotto controllo nelle ore successive all'allenamento.`,
      }
    }
    return null
  }

  return null
}
