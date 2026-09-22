# ADR — Carril canónico VIVA CUBA / Modo Mami

Fecha: 2026-09-23
Estado: ACTIVO

## Decisión

La continuidad de VIVA CUBA + DESAPLICAXI Identity Core se realiza exclusivamente en la rama:

`viva-cuba-modo-mami-canonical-20260923`

El punto base preservado es el último commit VIVA CUBA específico anterior a la entrada de commits KHAMINDRYA en `main`:

`487794a23182e396cf9d2b50c0c0290e88b7efcd`

Este punto conserva Madre Única v0.9.0, Release/Sync Core, identidad global DESAPLICAXI, OWNER global, invitaciones autoritativas y diagnóstico OWNER.

## Aislamiento

Se eliminan de este carril los artefactos de WORK SEARCH:
- workflow WSAX;
- preview WORK SEARCH;
- test WSAX.

No se integran KHAMINDRYA, WORK SEARCH ni otros proyectos en este carril.

## Promoción

`main` continúa como producción pública actual. La rama canónica no se promueve hasta completar CI, pruebas funcionales de invitación/autoenrolamiento, PWA, llamada y la prueba real España ↔ Cuba.

## Objetivo UX

Modo Mami debe converger a:
1. recibir un enlace;
2. abrir VIVA CUBA;
3. instalar cuando corresponda;
4. autoenrolar el dispositivo de forma segura;
5. mostrar a Axiel como contacto principal;
6. permitir iniciar llamada con una acción evidente.

Toda complejidad administrativa permanece en OWNER/Command Center.
