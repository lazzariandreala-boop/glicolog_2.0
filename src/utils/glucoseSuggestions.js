/**
 * Glucose suggestion logic — informational only, no medical advice.
 */

export const TREND_FACTORS = {
  '⬆': 1.20,
  '↗': 1.10,
  '→': 1.00,
  '↘': 0.90,
  '⬇': 0.80,
}

// ── MOOD / STATO D'ANIMO ──────────────────────────────────────────────────────
// Lo stress e le emozioni intense aumentano il cortisolo e l'adrenalina,
// che alzano la glicemia. Fattori indicativi (non sostitutivi del medico).
export const MOOD_FACTORS = {
  calmo:      1.00,
  euforico:   1.05, // adrenalina può alzare leggermente
  triste:     1.05, // ansia/tristezza può alzare moderatamente
  stressato:  1.10, // cortisolo alto → glicemia in salita
  arrabbiato: 1.15, // rabbia/agitazione intensa → picco glicemico possibile
}

export function moodFactor(mood) {
  return MOOD_FACTORS[mood] ?? 1.00
}

export function moodGlicHint(mood) {
  if (!mood || mood === 'calmo') return null
  const hints = {
    arrabbiato: { type: 'warn', msg: '😠 Rabbia/agitazione: gli ormoni dello stress possono alzare la glicemia. Monitora più spesso e considera un leggero aggiustamento del bolo.' },
    stressato:  { type: 'warn', msg: '😰 Stress attivo: il cortisolo tende ad alzare la glicemia. Considera +10% sul bolo oppure ricontrolla tra 1-2 ore.' },
    euforico:   { type: 'info', msg: '🤩 Stato euforico: l\'adrenalina può alzare temporaneamente la glicemia. Monitora le prossime misurazioni.' },
    triste:     { type: 'info', msg: '😔 Umore basso / ansia: può influenzare i livelli di glucosio. Tieni d\'occhio le prossime misurazioni.' },
  }
  return hints[mood] || null
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
 * Suggerimento per misurazione senza pasto.
 */
export function glucoseOnlySuggestion(glic, trend, cfg) {
  if (!glic) return null
  const { targetMin = 80, targetMax = 180, fsi } = cfg
  const dir = trendDir(trend)

  if (glic < 70) return null // gestito dall'alert ipo esistente

  if (glic < targetMin) {
    if (dir === 'down' || dir === 'steep-down') {
      return { type: 'warn', msg: `📉 Sotto il target e in calo — prendi qualcosa di dolce subito (succo, zucchero, caramelle).` }
    }
    return { type: 'warn', msg: `⬇️ Sotto il target — valuta se prendere qualcosa di dolce per tornare nel range.` }
  }

  if (glic <= targetMax) {
    if (dir === 'steep-down') {
      return { type: 'warn', msg: `📉 Sta scendendo velocemente — rischio di uscire dal range. Tieni d'occhio e valuta uno spuntino.` }
    }
    if (dir === 'down') {
      return { type: 'info', msg: `↘️ In lieve calo — nessuna azione urgente, ma continua a monitorare.` }
    }
    if (dir === 'steep-up') {
      const corrHint = fsi
        ? ` Se non hai mangiato di recente, una piccola correzione preventiva può aiutare a restare nel range — chiedi al tuo medico.`
        : ` Controlla di nuovo tra 20-30 minuti.`
      return { type: 'warn', msg: `📈 In salita rapida — rischio di superare il tuo target (${targetMax} mg/dL).${corrHint}` }
    }
    if (dir === 'up') {
      return { type: 'info', msg: `↗️ In lieve salita — monitora che non superi il tuo target (${targetMax} mg/dL).` }
    }
    return null
  }

  // sopra targetMax
  if (dir === 'steep-up' || dir === 'up') {
    const corrHint = fsi
      ? ` Considera una correzione con insulina rapida — chiedi conferma al tuo medico.`
      : ''
    return { type: 'warn', msg: `📈 Già alta e continua a salire.${corrHint}` }
  }
  if (dir === 'steep-down' || dir === 'down') {
    return { type: 'info', msg: `↘️ Alta ma sta scendendo — buon segno! Continua a monitorare.` }
  }
  // sopra range ma stabile
  return { type: 'warn', msg: `⚠️ Sopra il range (${targetMax} mg/dL) — valuta se fare una correzione con insulina rapida.` }
}

/**
 * Suggerimento sport nella schermata glicemia.
 */
export function sportGlicSuggestion(glic, trend, timing, sportType, cfg) {
  if (!glic || !timing || !sportType) return null
  const { targetMin = 80, targetMax = 180, fsi } = cfg
  const dir = trendDir(trend)

  if (timing === 'before' && sportType === 'aerobico') {
    if (glic < 70) return null
    if (glic <= 140) {
      return { type: 'warn', msg: `🍌 Glicemia a ${glic} mg/dL prima di correre o pedalare — mangia qualcosa di dolce (banana, succo) per non rischiare un calo durante l'attività.` }
    }
    if (glic > targetMax && fsi) {
      const normalCorr = Math.max(0.5, Math.round(((glic - targetMin) / fsi) * 2) / 2)
      const reducedCorr = Math.max(0.5, Math.round(normalCorr * 0.5 * 2) / 2)
      return { type: 'info', msg: `🏃 Alta prima dello sport — l'attività la abbasserà da sola. Se correggi, usa circa ${reducedCorr}U invece di ${normalCorr}U (metà dose). Chiedi conferma al tuo medico.` }
    }
    if (glic > targetMax) {
      return { type: 'info', msg: `🏃 Alta prima dello sport aerobico — l'attività aiuterà ad abbassarla. Considera di correggere meno del solito.` }
    }
    if (dir === 'down' || dir === 'steep-down') {
      return { type: 'warn', msg: `📉 In calo prima dello sport — prendi qualcosa di dolce per evitare un'ipoglicemia durante l'allenamento.` }
    }
    return null
  }

  if (timing === 'before' && sportType === 'anaerobico') {
    if (glic > targetMax) {
      return { type: 'warn', msg: `⚠️ Alta prima di pesi/HIIT — questo sport può farla salire ancora. Attenzione prima di correggere con insulina.` }
    }
    if (dir === 'up' || dir === 'steep-up') {
      return { type: 'info', msg: `↗️ In salita prima di pesi/HIIT — l'allenamento potrebbe farla salire ancora di più. Monitora dopo.` }
    }
    return { type: 'info', msg: `💪 Pesi e HIIT possono far salire la glicemia temporaneamente. Controlla dopo l'allenamento.` }
  }

  if (timing === 'after' && sportType === 'aerobico') {
    if (glic < targetMin) {
      return { type: 'warn', msg: `🍬 Bassa dopo lo sport — prendi subito qualcosa di dolce (succo, zucchero). L'effetto può durare ancora ore.` }
    }
    if (dir === 'steep-down' || dir === 'down') {
      return { type: 'warn', msg: `📉 Ancora in calo dopo lo sport — l'effetto dell'attività dura ore. Considera uno spuntino preventivo.` }
    }
    if (glic > targetMax) {
      return { type: 'info', msg: `⚡ Alta dopo lo sport aerobico — può capitare per lo stress fisico. Aspetta un po' e ricontrolla prima di correggere.` }
    }
    return null
  }

  if (timing === 'after' && sportType === 'anaerobico') {
    if (glic > targetMax) {
      return { type: 'info', msg: `⚡ Alta dopo pesi/HIIT — è normale! Il corpo rilascia ormoni che alzano la glicemia durante lo sforzo. Monitora nei prossimi minuti.` }
    }
    if (dir === 'steep-down' || dir === 'down') {
      return { type: 'warn', msg: `📉 In calo dopo l'allenamento — meno comune con i pesi, ma tienila d'occhio nelle prossime ore.` }
    }
    return null
  }

  return null
}
