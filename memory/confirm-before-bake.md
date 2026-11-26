---
name: confirm-before-bake
description: 3DMyHome：Blender の焼き直し（bake）を始める前に必ずユーザーに確認する
metadata:
  node_type: memory
  type: feedback
  originSessionId: 0fc5bb11-9306-4f17-9459-42ea10dd46e2
  modified: 2026-11-10T12:19:22.208Z
---

焼き直し（`run.py bake`。数時間かかる）を始める前に、何をどこまで焼くか・かかる時間を伝えてユーザーの了承を取る。書き出し・build・prep・swapatlas・uvcmp などの準備は先に進めてよい。

**Why:** 2026-11-10、ソファの直しの途中でユーザーが「焼きの前にこちらに必ず確認してね」と言った（直しが出揃うまでまとめて焼きたい。前回の焼き直しでは指摘が直っていなかった）。
**How to apply:** 準備まで終えたら、直した点・確かめた点・焼く範囲と時間をまとめて確認を頼み、返事を待つ。[[fewer-confirmations]] より優先。関連：[[3dmyhome-project]]
