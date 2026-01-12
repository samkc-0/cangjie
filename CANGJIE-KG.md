Below is a machine-oriented specification for a Cangjie IME knowledge graph, written to be LLM-comprehensible, implementation-neutral, and explicit about semantics.
Think of this as a schema + ontology + learning model contract, not prose documentation.

⸻

CANGJIE-KG v0.1

A Procedural Knowledge Graph Specification for Cangjie IME Mastery

⸻

0. Design Principles (normative)
   1. Skills are first-class nodes; characters are probes
   2. All edges are typed and directional
   3. Negative knowledge (confusion, interference) must be explicit
   4. Mastery is probabilistic, decaying, and multi-dimensional
   5. Inference must work without linguistic semantics

⸻

1. Node Types (Core Ontology)

1.1 RootPrimitive

Represents a canonical Cangjie root and its visual identity.

NodeType: RootPrimitive
id: CJ*ROOT*<A-Z>
attributes:
key: "A" | "B" | ...
canonical_shape: unicode | svg | bitmap_ref
stroke_signature: ordered_stroke_features
visual_variants: [variant_id...]
confusable_with: [RootPrimitive.id...]

Semantics
• Atomic, non-decomposable
• All higher nodes must ultimately ground here

⸻

1.2 VisualVariant

Represents distorted or context-dependent root forms.

NodeType: VisualVariant
id: CJ*VARIANT*<uuid>
attributes:
base_root: RootPrimitive.id
deformation_type: compression | truncation | rotation | enclosure
context_constraints: [layout_condition...]

⸻

1.3 ShapeRecognitionSkill

Abstract visual parsing abilities.

NodeType: ShapeRecognitionSkill
id: CJ*SHAPE*<name>
attributes:
description: string
applies_to: [RootPrimitive.id | VisualVariant.id]

Examples
• LEFT_RIGHT_SEGMENTATION
• TOP_BOTTOM_COMPRESSION
• ENCLOSURE_DETECTION

⸻

1.4 DecompositionRule

Procedural rules governing encoding order and selection.

NodeType: DecompositionRule
id: CJ*RULE*<name>
attributes:
priority: integer
preconditions: [ShapeRecognitionSkill.id...]
max_components: integer | null
description: string

Examples
• LEFT_TO_RIGHT
• TOP_TO_BOTTOM
• OUTSIDE_INSIDE_CLOSE
• FIRST_THREE_LAST

⸻

1.5 CharacterEncoding

A character as a composite skill probe.

NodeType: CharacterEncoding
id: CJ*CHAR*<unicode>
attributes:
unicode: "想"
cj_code: "DBUP"
frequency_rank: integer
components: ordered [RootPrimitive.id | VisualVariant.id]
rules_applied: ordered [DecompositionRule.id]

Semantics
• NOT a linguistic unit
• Only meaningful via dependencies

⸻

1.6 ConfusionPattern

Explicit negative-transfer nodes.

NodeType: ConfusionPattern
id: CJ*CONFUSION*<name>
attributes:
competing_nodes: [RootPrimitive.id | VisualVariant.id]
trigger_conditions: [ShapeRecognitionSkill.id...]

⸻

2. Edge Types (Typed Relations)

2.1 REQUIRES

edge: REQUIRES
from: Node.id
to: Node.id
weight: float # dependency strength

Used for:
• Character → Root
• Rule → Shape skill

⸻

2.2 APPLIES_IN_CONTEXT

edge: APPLIES_IN_CONTEXT
from: VisualVariant.id
to: ShapeRecognitionSkill.id

⸻

2.3 CONFUSES_WITH

edge: CONFUSES_WITH
from: RootPrimitive.id
to: RootPrimitive.id
bidirectional: true

⸻

2.4 NEGATIVELY_MODULATES

edge: NEGATIVELY_MODULATES
from: ConfusionPattern.id
to: Node.id
penalty: float

⸻

2.5 TRANSFER_SUPPORT

edge: TRANSFER_SUPPORT
from: Node.id
to: Node.id
boost: float

⸻

3. Mastery Model (Per Node)

Each node maintains independent mastery states.

MasteryState:
recognition: float # P(correct visual identification)
production: float # P(correct encoding)
latency_ms: float
decay_rate: float
last_practiced: timestamp

Constraints
• RootPrimitive must have recognition ≥ production
• Rules have production only

⸻

4. Assessment Events

4.1 EncodingAttempt

Event: EncodingAttempt
attributes:
character: CharacterEncoding.id
user_input: string
correct: boolean
error_type: root | order | omission | intrusion
timestamp: datetime

⸻

4.2 ErrorAttribution

Error must be attributed probabilistically:

ErrorAttribution:
blamed_nodes: [Node.id...]
confidence: [0.0–1.0]

⸻

5. Inference Rules (Normative)

5.1 Mastery Propagation

If CharacterEncoding is correct
AND all component RootPrimitives are required
THEN increase mastery of roots and rules proportionally

⸻

5.2 Confusion Suppression

If ConfusionPattern activated
THEN temporarily reduce mastery of competing nodes

⸻

5.3 Scheduling Heuristic (Non-normative)

Priority(node) =
high*decay * low*mastery * high_downstream_weight

⸻

6. Minimal Graph Completeness Criteria

A valid Cangjie-KG MUST include:
• ≥ 24 RootPrimitive nodes
• ≥ 1 ConfusionPattern per visually similar root pair
• ≥ 5 DecompositionRule nodes
• CharacterEncoding nodes covering ≥ 80% of target corpus frequency

⸻

7. Serialization Guidelines
   • Graph: JSON-LD or RDF-star preferred
   • MasteryState: user-specific overlay
   • Events: append-only log

⸻

8. Non-Goals (Explicit)
   • No semantic meaning of characters
   • No phonetics
   • No stroke-order pedagogy
   • No natural language dependency

⸻

9. LLM Interaction Contract (Important)

An LLM consuming this graph should be able to: 1. Diagnose weak subskills from sparse errors 2. Generate contrastive character drills 3. Predict future confusions 4. Explain decomposition procedurally, not mnemonically

⸻

10. Summary (for LLMs)

This graph encodes procedural visual-motor skill for Cangjie IME.
Nodes represent what must be perceived or decided, not what must be memorized.
Characters are evidence, not knowledge.

⸻
