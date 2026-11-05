# Étude de l'existant : gestion locative en Côte d'Ivoire

*Relevé effectué le 4 novembre 2026, à partir des sites officiels de chaque service. Ces informations viennent des éditeurs eux-mêmes : elles n'ont pas été testées en conditions réelles.*

## Tableau comparatif

Légende : ✅ proposé · ⚠️ partiel ou limité · ❌ absent ou explicitement prévu « plus tard » · — non indiqué sur le site

| Fonctionnalité | **LoyerFacile** | Nianso | LoyerPay CI | Bowari | MonLoyer |
|---|---|---|---|---|---|
| **Cible principale** | Petits et moyens propriétaires | Propriétaires, SCI, agences | Locataires, propriétaires, agences | Propriétaires (1 à 10+ biens), agences | Petits propriétaires (2 à 20 logements) |
| **Biens, unités, locataires** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Tableau de bord, statistiques** | ✅ encaissé, reste à percevoir, occupation, graphique sur 6 mois | ✅ revenus, taux de recouvrement | ✅ rapports détaillés | ✅ temps réel | ✅ revenus, impayés |
| **Suivi des impayés (propriétaire)** | ✅ cumul par locataire et par mois | ✅ | ⚠️ relances des retards, pas de liste d'impayés annoncée | ⚠️ « retards » sur le tableau de bord | ✅ |
| **Espace locataire** | ✅ web, accès par lien d'invitation | ✅ portail (offre payante) | ✅ application mobile | ✅ portail web | ❌ prévu en V2/V3 |
| **Le locataire voit ses mois impayés** | ✅ frise mois par mois et montant total dû | — | ⚠️ historique des paiements seulement | ⚠️ historique des paiements seulement | ❌ |
| **Paiement en ligne Mobile Money** | ❌ étape 2 (agrégateur, en mode test) | ✅ Wave, Orange, MTN (offre payante) | ✅ Orange Money, Wave, MoMo | ✅ Wave, Orange, MTN, Moov, Free Money | ❌ |
| **Paiement par carte bancaire** | ❌ | — | — | ✅ Visa, Mastercard | ❌ |
| **Déclaration manuelle par le locataire, validée par le propriétaire** | ✅ avec référence de transaction | — | — | — | ❌ |
| **Reçus et quittances** | ✅ imprimables ou en PDF, envoi par WhatsApp | ✅ PDF envoyé sur WhatsApp | ✅ | ✅ conformes, téléchargeables | ✅ PDF |
| **Relances automatiques** | ⚠️ bouton WhatsApp avec message rédigé, sans frais | ✅ WhatsApp | ✅ | ✅ SMS ou WhatsApp, 7, 3 et 1 jour avant l'échéance | ⚠️ bouton WhatsApp manuel |
| **Cautions et avances** | ✅ avance appliquée aux premiers mois, retenues, décompte de sortie signé | — | — | — | ❌ prévu en V2/V3 |
| **Application mobile** | ✅ PWA installable, fonctionne hors ligne | ⚠️ mode hors ligne, sans application en magasin | ✅ Google Play, App Store | — | — |
| **Modes clair et sombre** | ✅ | — | — | — | — |
| **Tarif** | Gratuit (projet académique) | 0 F (2 biens) · 15 000 F · 35 000 F / mois · sur devis | — | Aucun abonnement, 1 % par paiement réussi | Gratuit (code open source) |

**Services trouvés mais non comparés :**
- **IlePay** (ilepay-ci.com) : son site n'était pas accessible lors du relevé, à cause d'une erreur de certificat.
- **ByteeLoge** : son contenu ne s'affiche pas sans JavaScript.
- **Locatys** : startup lancée à Abidjan en 2018. L'article de référence était indisponible lors du relevé, et son activité actuelle n'a pas pu être vérifiée.

## Ce qui ressort

1. **Le besoin est confirmé.** Au moins cinq services ciblent ce marché, dont Nianso, fondé en 2025. Les loyers payés en espèces ou de main à main sont un vrai problème.
2. **Le paiement Mobile Money est la norme chez les acteurs commerciaux.** Il est soit facturé à l'abonnement (Nianso), soit prélevé en commission sur chaque loyer (Bowari, 1 %).
3. **Ce qui manque presque partout :**
   - **le détail des impayés côté locataire** : les autres services montrent un historique des paiements, pas « vous devez octobre et novembre » ;
   - **la gestion des cautions et des avances** (« 2 mois de caution + 1 mois d'avance »), alors que c'est la règle à Abidjan ;
   - **une option sans frais** pour le propriétaire qui reçoit déjà ses loyers par Wave ou Orange Money sur son propre numéro.

## Positionnement de LoyerFacile

- **Points forts actuels :**
  - la **transparence pour le locataire**, avec une frise mois par mois et le montant exact dû ;
  - la **déclaration avec référence**, validée par le propriétaire : aucune commission, aucun contrat marchand nécessaire ;
  - une **sécurité par rôles** : chaque propriétaire et chaque locataire n'accède qu'à ses propres données.
- **Retards à combler :**
  - le paiement en ligne (étape 2, via un agrégateur comme CinetPay, en mode test) ;
  - les relances automatiques ;
  - l'envoi des reçus par WhatsApp.
- **Différenciation possible :** la **gestion des cautions et des avances**, avec le calcul automatique du solde à la sortie du locataire, et une offre pensée pour les **cours communes** et les petits bailleurs.

## Sources

- Nianso : https://nianso-immo.com/
- LoyerPay CI : https://loyerpay.ci/
- Bowari : https://bowari.ci/
- MonLoyer (GitHub) : https://github.com/ysosthenehartmann-wq/MonLoyer
- IlePay : http://www.ilepay-ci.com/
- ByteeLoge : https://www.byteeloge.com/
- Locatys : https://www.lafinancedigitale.com/articles/locatys-un-outil-de-paiement-et-de-suivi-des-loyers-en-cote-divoire
- Contexte du marché : https://www.financialafrik.com/2026/03/30/de-limmobilier-au-mobile-money-la-fintech-ivoirienne-cherche-a-capter-leconomie-informelle/
