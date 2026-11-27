# Para além da linha · Simulador de CTG intraparto

Plataforma de formação em cardiotocografia: casos clínicos que evoluem com as decisões, treino rápido de classificação (FIGO 2015, ACOG 2025, NICE NG229), os 552 traçados reais da base CTU-UHB com desfecho neonatal e exame em sala por QR code.

**Site:** https://tiagoiram-lang.github.io/simulador-ctg/

## Estrutura

- `index.html`: página única com todas as secções
- `css/`: estilos (`brand.css` tem a identidade visual)
- `js/`: motor do traçado (`engine.js`), casos (`cases.js`), treino e exame (`drill.js`), traçados reais (`real.js`), exame em sala (`live.js`), página de entrada (`home.js`)
- `js/config.js`: ligação à Supabase para o exame em sala (chave publicável; nunca a secreta)
- `data/ctu-index.json`: lista e metadados dos 552 partos; `data/ctu-N.json`: o sinal, em blocos carregados a pedido

O site é estático: qualquer alteração enviada para o ramo `main` fica publicada pelo GitHub Pages em 1 a 2 minutos.

## Fontes

- Chudáček V. et al. *Open access intrapartum CTG database.* BMC Pregnancy and Childbirth, 2014. Dados: CTU-UHB Intrapartum Cardiotocography Database, PhysioNet (licença ODC-By).
- FIGO 2015; ACOG Clinical Practice Guideline n.º 10 (2025); NICE NG229 (atualização de 2025).

Ferramenta de ensino. Não substitui o julgamento clínico nem os protocolos da instituição.
