// ============================================================================
// ENVOI D'EMAILS — via Brevo (offre gratuite : 300 emails par jour)
// Variables d'environnement (dans .env en local, dans Vercel en ligne) :
//   BREVO_API_KEY : clé API Brevo (Paramètres → SMTP & API → Clés API)
//   MAIL_FROM     : adresse expéditrice, validée dans Brevo (Expéditeurs)
//   MAIL_FROM_NAME: nom affiché (facultatif, « LoyerFacile » par défaut)
// Sans clé en local, l'email n'est pas envoyé : son contenu s'affiche dans le terminal,
// pour pouvoir tester sans compte Brevo.
// ============================================================================
const EN_LIGNE = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

async function envoyerEmail({ a, nom, sujet, texte, html }) {
  const cle = process.env.BREVO_API_KEY?.trim();
  const expediteur = process.env.MAIL_FROM?.trim();

  if (!cle || !expediteur) {
    if (EN_LIGNE) throw new Error('Envoi d’email non configuré (BREVO_API_KEY ou MAIL_FROM manquant)');
    console.log(`\n📧 [email non envoyé : mode local]\nÀ : ${a}\nSujet : ${sujet}\n${texte}\n`);
    return;
  }

  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json', 'api-key': cle },
    body: JSON.stringify({
      sender: { email: expediteur, name: process.env.MAIL_FROM_NAME?.trim() || 'LoyerFacile' },
      to: [{ email: a, name: nom || a }],
      subject: sujet,
      textContent: texte,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error(`Brevo a refusé l’envoi (${r.status}) ${detail.slice(0, 200)}`);
  }
}

// Échappe le texte inséré dans le HTML de l'email
const echapper = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function emailReinitialisation({ nom, lien }) {
  const texte = `Bonjour ${nom},

Vous avez demandé à changer votre mot de passe LoyerFacile.
Ouvrez ce lien pour en choisir un nouveau (valable 1 heure, utilisable une seule fois) :
${lien}

Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe actuel reste valable.

L'équipe LoyerFacile`;

  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#172033">
  <h2 style="color:#0d9467">LoyerFacile</h2>
  <p>Bonjour ${echapper(nom)},</p>
  <p>Vous avez demandé à changer votre mot de passe. Cliquez sur le bouton pour en choisir un nouveau :</p>
  <p style="text-align:center;margin:28px 0">
    <a href="${echapper(lien)}" style="background:#10b981;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Choisir un nouveau mot de passe</a>
  </p>
  <p style="font-size:13px;color:#5b6780">Ce lien est valable <strong>1 heure</strong> et ne sert qu’une fois.<br>
  Si vous n’êtes pas à l’origine de cette demande, ignorez cet email : votre mot de passe actuel reste valable.</p>
</div>`;

  return { sujet: 'Réinitialiser votre mot de passe LoyerFacile', texte, html };
}

module.exports = { envoyerEmail, emailReinitialisation };
