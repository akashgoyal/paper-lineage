# Paper Lineage concept glossary

Vocabulary for the ideas in this dataset: 25 themes, each with the concepts that belong to it.
"Introduced by" names the paper credited with the idea in this dataset.

## Convolutional networks

The CNN era: deeper, wider and more modular convolutional backbones for vision.

- **Very deep 3×3 ConvNets**: Stack many small 3×3 convolutions; depth alone drives accuracy. Introduced by VGG (2014). Also called: vgg, vggnet, very deep convolutional.
- **Deconvnet feature visualisation**: Project activations back to pixel space to see what each CNN layer has learned. Introduced by ZFNet (2013). Also called: zfnet, deconvolutional network visualization.
- **Inception module**: Parallel convolutions of several sizes in one block, to go deeper and wider at fixed cost. Introduced by GoogLeNet (Inception) (2014). Also called: inception, googlenet.
- **Residual connection**: Add a layer's input to its output so very deep networks stay trainable. Introduced by ResNet (2015). Also called: skip connection, residual learning, resnet, residual block.
- **Wide residual networks**: Shallower but wider residual blocks train faster and match very deep ResNets. Introduced by Wide ResNet (2016). Also called: wide resnet, wrn.
- **Cardinality (grouped convolutions)**: Split a block into many parallel same-shaped paths; the number of paths is a new scaling axis. Introduced by ResNeXt (2016). Also called: resnext, grouped convolution, aggregated transformations.

## Sequence models & translation

Recurrent, convolutional and encoder–decoder models that map one sequence to another.

- **LSTM recurrent networks**: Gated recurrent networks that keep information over long sequences. Also called: long short-term memory, lstm.
- **Encoder–decoder seq2seq**: Encode an input sequence, then decode an output sequence from it. Introduced by Seq2Seq (2014). Also called: sequence to sequence, encoder-decoder.
- **WordPiece subword tokens**: Split rare words into frequent sub-word pieces so the vocabulary stays small and open. Introduced by GNMT (2016). Also called: wordpiece, subword units.
- **Language-independent subword tokenizer**: Train subword models directly on raw text, with no language-specific pre-tokenisation. Introduced by SentencePiece (2018). Also called: sentencepiece.
- **Dilated convolutional sequence models**: Model long sequences with stacked dilated 1-D convolutions that run in linear time. Introduced by ByteNet (2016). Also called: bytenet, dilated convolution.
- **Convolutional seq2seq**: A fully convolutional encoder–decoder with gated linear units and per-layer attention. Introduced by ConvS2S (2017). Also called: convs2s, gated linear units.

## Attention & Transformers

Attention mechanisms and the Transformer family, plus their positional and feed-forward refinements.

- **Attention mechanism**: Let a decoder look back at the most relevant input positions instead of one fixed vector. Introduced by Bahdanau attention (2014). Also called: soft attention, alignment model, jointly learning to align.
- **Self-attention**: Every token attends to every other token, weighted by learned query–key similarity. Introduced by Transformer (2017). Also called: multi-head attention, scaled dot-product attention, self-attention.
- **Transformer**: A sequence model built only from attention and feed-forward layers, with no recurrence. Introduced by Transformer (2017). Also called: transformer encoder, transformer decoder, transformer.
- **Sinusoidal positional encoding**: Add fixed sine/cosine signals so an order-blind Transformer knows token positions. Introduced by Transformer (2017). Also called: positional encoding, position embedding.
- **Inducing-point attention (learned latents)**: A few learned vectors attend to a large set and summarise it: the idea behind later resamplers and query transformers. Introduced by Set Transformer (2018). Also called: set transformer, inducing points, induced set attention.
- **Segment-level recurrence & relative positions**: Reuse hidden states from earlier segments so attention can reach beyond a fixed context. Introduced by Transformer-XL (2019). Also called: transformer-xl, relative positional encoding.
- **Gated feed-forward variants (SwiGLU)**: Replace the Transformer's ReLU feed-forward with gated linear units for better quality. Introduced by GLU variants (2020). Also called: swiglu, geglu, glu variants.
- **Latent-array cross-attention (Perceiver)**: A small latent array cross-attends to huge inputs, decoupling depth from input size. Introduced by Perceiver (2021). Also called: perceiver, latent array, latent bottleneck.
- **Rotary position embedding (RoPE)**: Encode position by rotating query/key vectors, giving relative-position awareness inside attention. Introduced by RoFormer (RoPE) (2021). Also called: rope, rotary.

## Vision Transformers

Transformers applied to images and video, and how to train and scale them.

- **Vision Transformer (ViT)**: Split an image into patches and feed them to a plain Transformer as tokens. Introduced by ViT (2020). Also called: vit, patch embedding, image patches, vision transformer.
- **Distillation token (data-efficient ViT)**: Train ViTs on ImageNet alone by adding a token that learns from a CNN teacher. Introduced by DeiT (2020). Also called: deit, distillation through attention.
- **Shifted-window hierarchical ViT**: Attention inside local windows that shift between layers, with multi-scale feature maps. Introduced by Swin (2021). Also called: swin, shifted windows, hierarchical transformer.
- **Scaling laws for vision Transformers**: How ViT error falls with model size, data and compute, up to billions of parameters. Introduced by Scaling ViTs (ViT-G) (2021). Also called: vit-g, scaling vision transformers.
- **Convolution–attention hybrids**: Stack convolution stages before attention stages to get both inductive bias and capacity. Introduced by CoAtNet (2021). Also called: coatnet, relative attention.
- **Local video Transformers**: Extend windowed attention across space and time for video recognition. Introduced by Video Swin (2021). Also called: video swin, spatio-temporal attention.
- **Residual post-norm & cosine attention**: Stabilise very large vision Transformers and transfer them across resolutions. Introduced by Swin V2 (2021). Also called: swin v2, cosine attention, log-spaced position bias.

## Efficient & searched architectures

Mobile-friendly building blocks, neural architecture search and principled model scaling.

- **Depthwise-separable convolutions**: Factor a convolution into per-channel and 1×1 steps to cut computation drastically. Introduced by MobileNets (2017). Also called: mobilenet, depthwise separable.
- **Inverted residuals & linear bottlenecks**: Expand, filter with depthwise conv, then project back down to thin residual bottlenecks. Introduced by MobileNetV2 (2018). Also called: mobilenetv2, inverted residual.
- **Neural architecture search**: Search for a network's building block automatically instead of designing it by hand. Introduced by NASNet (2017). Also called: nas, nasnet, architecture search.
- **Latency-aware architecture search**: Put measured on-device latency into the search objective. Introduced by MnasNet (2018). Also called: mnasnet, platform-aware.
- **Compound model scaling**: Scale depth, width and resolution together with one coefficient. Introduced by EfficientNet (2019). Also called: efficientnet, compound coefficient.

## Language model pre-training

From word vectors to BERT-style and seq2seq pre-training objectives for text.

- **Word embeddings (skip-gram / CBOW)**: Learn dense word vectors by predicting nearby words in huge text corpora. Introduced by word2vec (2013). Also called: word2vec, skip-gram, word vectors, word embeddings.
- **Large-scale RNN language models**: Push LSTM language models to billions of words and huge vocabularies. Introduced by Limits of Language Modeling (2016). Also called: one billion word, character cnn.
- **Contextual word vectors**: Word vectors that depend on the sentence, taken from a pretrained encoder. Introduced by Learned in Translation (2017). Also called: cove, context vectors, contextualized word vectors.
- **Deep bidirectional LM features**: Use all internal layers of a pretrained bidirectional LM as features for downstream tasks. Introduced by ELMo (2018). Also called: elmo, bidirectional language model, bilm.
- **Pre-train, then fine-tune**: Train one big model on unlabelled data, then fine-tune it briefly for each task. Also called: fine-tuning, pre-training and fine-tuning, transfer learning.
- **Masked language modelling**: Hide some tokens and predict them from context on both sides. Introduced by BERT (2018). Also called: mlm, masked language model, cloze.
- **Unified LM via attention masks**: One Transformer does bidirectional, left-to-right and seq2seq modelling by switching attention masks. Introduced by UniLM (2019). Also called: unilm, seq2seq attention mask, self-attention masks.
- **Permutation language modelling**: Autoregressive training over all factorisation orders, capturing bidirectional context without masks. Introduced by XLNet (2019). Also called: xlnet, permutation.
- **Robustly optimised BERT recipe**: Train BERT longer, on more data, with bigger batches and dynamic masking. Introduced by RoBERTa (2019). Also called: roberta, dynamic masking.
- **Cross-layer parameter sharing**: Share weights across layers and factorise embeddings to shrink BERT. Introduced by ALBERT (2019). Also called: albert, factorized embedding, sentence order prediction.
- **Span-corruption denoising**: Replace random spans with sentinels and train the decoder to fill them in. Introduced by T5 (2019). Also called: span corruption, c4.
- **Denoising seq2seq pre-training**: Corrupt text in many ways and train an encoder–decoder to reconstruct it. Introduced by BART (2019). Also called: bart, text infilling, sentence permutation.
- **Mixture-of-denoisers objective**: Train on a mix of short-span, long-span and prefix denoising tasks. Introduced by U-PaLM (2022). Also called: ul2, ul2r, mixture of denoisers.

## Large language models & scaling

Very large autoregressive LMs, what scale buys you, and how to spend compute.

- **Autoregressive language modelling**: Predict the next token, so the model can generate text left to right. Also called: next-token prediction, causal language model, decoder-only, autoregressive.
- **In-context / few-shot learning**: A large model solves a new task from a few examples in its prompt, with no gradient updates. Introduced by GPT-3 (2020). Also called: few-shot, in-context learning, few-shot learners.
- **Neural scaling laws**: Loss falls as a power law in model size, data and compute. Introduced by Kaplan scaling laws (2020). Also called: scaling laws, power law.
- **Compute-optimal training**: For a fixed budget, grow parameters and training tokens together; most big LMs were undertrained. Introduced by Chinchilla (2022). Also called: chinchilla, compute-optimal.
- **Emergent abilities**: Abilities that are absent in small models and appear abruptly at scale. Introduced by Emergent abilities (2022). Also called: emergent.
- **Knowledge stored in LM parameters**: Answer factual questions from model weights alone, with no retrieval. Introduced by Knowledge in LM parameters (2020). Also called: closed-book question answering, lm as knowledge base.
- **Prompt mining & paraphrasing**: Search for better prompts to get a truer read on what an LM knows. Introduced by LPAQA (What LMs know) (2019). Also called: lpaqa, prompt paraphrasing.
- **Open-weights LLMs**: Release large LM weights so researchers can study and build on them. Introduced by OPT (2022). Also called: opt, open pre-trained, gpt-neox, publicly available weights.
- **Code LLMs & pass@k**: LMs fine-tuned on code, measured by whether sampled programs pass unit tests. Introduced by Codex (2021). Also called: codex, humaneval, pass@k.
- **Trained verifiers**: Sample many solutions and let a trained verifier pick the right one. Introduced by GSM8K verifiers (2021). Also called: verifiers, gsm8k.
- **Knowledge-grounded dialogue LMs**: Fine-tune dialogue models to consult external tools and knowledge for factual answers. Introduced by LaMDA (2022). Also called: lamda, external knowledge.

## Instruction tuning & alignment

Teaching LMs to follow instructions and human preferences.

- **Instruction tuning**: Fine-tune on many tasks phrased as instructions, so the model follows new instructions zero-shot. Introduced by FLAN (2021). Also called: instruction tuning, instruction finetuning, finetuned language models.
- **Crowdsourced instruction datasets**: Collections of tasks paired with human-written instructions, used to train and test instruction following. Introduced by Natural Instructions (2021). Also called: natural instructions, super-naturalinstructions, task instructions.
- **Prompted multitask training**: Train on many datasets rewritten into diverse natural-language prompts. Introduced by T0 (2021). Also called: t0, p3, multitask prompted.
- **Chain-of-thought in instruction tuning**: Include step-by-step reasoning examples in instruction tuning to unlock reasoning. Introduced by Flan-T5 / Flan-PaLM (2022). Also called: chain-of-thought, cot.
- **Proximal policy optimisation**: A simple, stable policy-gradient method with a clipped surrogate objective. Introduced by PPO (2017). Also called: ppo, proximal policy.
- **RL from human feedback**: Learn a reward model from human comparisons, then optimise the LM against it. Introduced by RLHF for LMs (Ziegler) (2019). Also called: rlhf, human feedback, reward model, human preferences.
- **SFT → reward model → PPO pipeline**: Supervised demonstrations, then a preference reward model, then RL: the recipe behind chat assistants. Introduced by InstructGPT (2022). Also called: instructgpt, follow instructions with human feedback.
- **Recursive task decomposition**: Break a hard-to-judge task into smaller ones that humans can supervise. Introduced by Recursive book summarization (2021). Also called: recursive summarization.

## Parameter-efficient adaptation

Adapt a big frozen model by training only a small number of new parameters.

- **Adapter modules**: Insert small trainable layers into a frozen network, one set per task. Introduced by Adapters (2019). Also called: adapters, adapter modules.
- **Prefix tuning**: Optimise a few continuous 'virtual tokens' prepended at every layer of a frozen LM. Introduced by Prefix-Tuning (2021). Also called: prefix-tuning, continuous prompts.
- **Soft prompt tuning**: Learn only input-level prompt embeddings; it rivals full fine-tuning at scale. Introduced by Prompt tuning (2021). Also called: soft prompts, prompt tuning.

## Self-supervised visual learning

Learning visual features without labels: contrastive, mutual-information and masked-prediction methods.

- **Instance discrimination**: Treat every image as its own class and learn features that tell instances apart. Introduced by Instance discrimination (2018). Also called: instance discrimination, non-parametric, noise-contrastive.
- **Contrastive predictive coding / InfoNCE**: Predict future latents and score them against negatives with a contrastive loss. Introduced by CPC (2018). Also called: cpc, infonce, contrastive predictive coding.
- **Mutual-information maximisation**: Learn features by maximising information shared between an input and its encoding, or between views. Introduced by Deep InfoMax (2018). Also called: deep infomax, amdim, mutual information.
- **Momentum contrast**: A queue of negatives encoded by a slowly-updated momentum encoder. Introduced by MoCo (2019). Also called: moco, momentum encoder, momentum contrast, queue.
- **Augmentations + projection head**: Strong augmentation plus a nonlinear projection head is what makes contrastive learning work. Introduced by SimCLR (2020). Also called: simclr, projection head, data augmentation composition.
- **Self-distillation without negatives**: An online network predicts a slowly-moving target network's view, with no negatives needed. Introduced by BYOL (2020). Also called: byol, bootstrap your own latent, online and target networks.
- **Masked image modelling**: Hide image patches and predict them, the vision analogue of BERT. Introduced by BEiT (2021). Also called: mim, masked image modeling, masked patch prediction.
- **Masked autoencoders**: Mask 75% of patches, encode only the visible ones, and reconstruct pixels with a light decoder. Introduced by MAE (2021). Also called: mae, masked autoencoder, asymmetric encoder-decoder.
- **Semantic visual tokenizer (VQ-KD)**: Distil a semantic teacher into discrete codes, and use them as masked-prediction targets. Introduced by BEiT v2 (2022). Also called: vq-kd, beit v2, vector-quantized knowledge distillation.
- **Masked prediction of CLIP features**: Reconstruct masked-out CLIP features, which scales a plain ViT to a billion parameters. Introduced by EVA (2022). Also called: eva, image-text aligned vision features.

## Transfer learning & weak supervision

Pre-train on huge, cheap or noisy labels, then transfer to downstream tasks.

- **Off-the-shelf deep features**: Activations of an ImageNet CNN make strong generic features for new tasks. Introduced by DeCAF (2013). Also called: decaf, cnn features off-the-shelf, generic features.
- **Weakly supervised pre-training**: Use huge amounts of cheap, noisy labels instead of clean annotations. Introduced by Weakly supervised visual features (Joulin) (2015). Also called: weakly supervised, noisy labels, weakly-labeled.
- **Natural-language supervision for vision**: Train image models to predict free-form words and phrases from accompanying text. Introduced by Visual N-Grams (2016). Also called: visual n-grams, user comments, learning from text.
- **Data scaling in vision**: Performance keeps rising (logarithmically) with 100× more labelled images. Introduced by JFT-300M (unreasonable effectiveness) (2017). Also called: jft-300m, unreasonable effectiveness of data.
- **Hashtag supervision at billion scale**: Pre-train on billions of social-media images labelled only by their hashtags. Introduced by Instagram hashtag pre-training (2018). Also called: hashtags, instagram.
- **Domain-adaptive pre-training data**: Reweight pre-training data towards the target domain; more data is not always better. Introduced by Domain adaptive transfer (2018). Also called: domain adaptive transfer, importance weights.
- **Teacher–student self-training**: A teacher labels a huge unlabelled pool; a student learns from those pseudo-labels. Introduced by Billion-scale semi-supervised (2019). Also called: semi-supervised, teacher/student, pseudo-labels.
- **Noisy Student training**: Self-training with an equal-or-larger student and noise added to it, iterated. Introduced by Noisy Student (2019). Also called: noisy student.
- **Big Transfer recipe**: Large-scale supervised pre-training plus a simple, fixed transfer heuristic. Introduced by BiT (2019). Also called: bit, big transfer.
- **Captioning as visual pre-training**: Learn visual backbones by generating captions, which is data-efficient compared to classification. Introduced by VirTex (2020). Also called: virtex, textual annotations.

## Detector-based vision-language pre-training

BERT-style vision-language models built on object-detector region features (2019–2021).

- **Object-detector region features**: Represent an image by features of detected object regions instead of a pixel grid. Introduced by Bottom-Up Top-Down attention (2017). Also called: bottom-up attention, region features, faster r-cnn features, bottom-up and top-down.
- **Two-stream co-attention**: Separate image and text streams exchange information through co-attention layers. Introduced by ViLBERT (2019). Also called: co-attention, two-stream, cross-modal attention, cross-attention.
- **Masked region modelling**: Mask image regions and predict their object class or features from the text and other regions. Introduced by ViLBERT (2019). Also called: masked region, masked object classification, masked multimodal modelling.
- **Single-stream VL Transformer**: Concatenate words and image regions and run one Transformer over both. Introduced by VisualBERT (2019). Also called: visualbert, single-stream, unified encoder.
- **QA as a pre-training task**: Add image question answering to the vision-language pre-training mix. Introduced by LXMERT (2019). Also called: lxmert, cross-modality encoder.
- **Shared encoder–decoder VLP**: One Transformer for both VL understanding and generation, switched by attention masks. Introduced by Unified VLP (2019). Also called: unified vlp, seq2seq masked vision-language.
- **Word–region alignment**: Explicitly align words to image regions with an optimal-transport objective. Introduced by UNITER (2019). Also called: uniter, optimal transport, wra.
- **Object tags as alignment anchors**: Feed detected object labels as text so they anchor image–text alignment. Introduced by Oscar (2020). Also called: oscar, object tags.
- **VL-specific object detector**: A bigger detector trained on merged datasets gives much better region features for VL. Introduced by VinVL (2021). Also called: vinvl, object-centric representations.

## End-to-end vision-language pre-training

Vision-language models trained from pixels, without a separate object detector.

- **Grid features instead of regions**: Plain convolutional grid features match region features for VQA and run 10× faster. Introduced by Grid features for VQA (2020). Also called: grid features.
- **Detector-free patch VL Transformer**: Feed raw image patches straight into the VL Transformer: no CNN, no detector. Introduced by ViLT (2021). Also called: vilt, without convolution or region supervision, patch projection.
- **Align before fuse**: Align unimodal embeddings contrastively before fusing them with cross-attention. Introduced by ALBEF (2021). Also called: albef, align before fuse.
- **Momentum distillation**: Learn from soft targets produced by a moving-average model, tolerating noisy web pairs. Introduced by ALBEF (2021). Also called: momentum distillation, pseudo-targets.
- **Image–text matching (ITM)**: A binary classifier decides whether an image and a caption match, trained with hard negatives. Also called: itm, image-text matching, hard negative, visual-linguistic matching.
- **PrefixLM vision-language pre-training**: One generative prefix-LM objective on weakly aligned pairs replaces many task-specific losses. Introduced by SimVLM (2021). Also called: simvlm, prefixlm, prefix language modeling.
- **Mixture of modality experts**: Shared attention with per-modality feed-forward experts, usable as a dual or fusion encoder. Introduced by VLMo (2021). Also called: vlmo, mome, modality experts.
- **Masked vision-language modelling**: Masked prediction over image patches and text tokens together, in one shared backbone. Introduced by VL-BEiT (2022). Also called: vl-beit, masked vision-language.
- **Multiway Transformer (image as a foreign language)**: Treat images as another language and pre-train one multiway model with masked 'language' modelling on all. Introduced by BEiT-3 (2022). Also called: beit-3, multiway, imglish.
- **Caption bootstrapping (CapFilt)**: Generate synthetic captions for web images and filter noisy ones, then retrain on cleaner data. Introduced by BLIP (2022). Also called: capfilt, captioner and filter, synthetic captions, bootstrapping the captions.
- **Multimodal mixture of encoder–decoder**: One model that acts as a contrastive encoder, a matching encoder or a caption decoder. Introduced by BLIP (2022). Also called: med, multimodal mixture.

## Contrastive image–text models

Dual encoders that align images and text in one embedding space, enabling zero-shot transfer.

- **Joint image–text embedding**: Map images and sentences into one space so they can be retrieved by similarity. Introduced by Deep Fragment Embeddings (2014). Also called: multi-modal embedding, common embedding space, fragment embeddings, bidirectional retrieval.
- **Contrastive image–text learning**: Pull matching image and text embeddings together and push mismatched pairs apart. Introduced by ConVIRT (2020). Also called: image-text contrastive, itc, contrastive learning from paired images and text, convirt.
- **Zero-shot transfer via text prompts**: Classify into unseen classes by comparing an image with text descriptions of them. Introduced by CLIP (2021). Also called: zero-shot, prompt ensembling, zero-shot classification.
- **Scaling on raw alt-text**: Skip expensive cleaning: a billion noisy alt-text pairs beat curated datasets. Introduced by ALIGN (2021). Also called: align, noisy text supervision, alt-text.
- **Locked image tuning**: Keep a pretrained image tower frozen and train only the text side contrastively. Introduced by LiT (2021). Also called: lit, locked-image, frozen image encoder.
- **Vision foundation model**: One large image–text model adapted to classification, retrieval, detection, video and more. Introduced by Florence (2021). Also called: florence, foundation model.
- **Unified image–text–label contrastive**: Treat class labels and captions alike in one contrastive space. Introduced by UniCL (2022). Also called: unicl.
- **Contrastive + captioning in one model**: One image–text encoder–decoder trained with both a contrastive and a captioning loss. Introduced by CoCa (2022). Also called: coca, contrastive captioner.

## Vision-language models on frozen LLMs

Connect a pretrained vision encoder to a frozen large language model through a small trainable bridge.

- **Frozen language model**: Keep a pretrained LM fixed and teach only a small module to feed it new information. Introduced by Frozen (2021). Also called: frozen language model, frozen llm, frozen lm.
- **Visual prefix for a frozen LM**: Turn an image into a few embeddings that a frozen LM reads as if they were words. Introduced by Frozen (2021). Also called: visual prefix, prefix, continuous embeddings.
- **Perceiver resampler**: Learned queries cross-attend to many visual features and compress them to a fixed number of tokens. Introduced by Flamingo (2022). Also called: perceiver resampler, resampler.
- **Gated cross-attention layers**: New cross-attention layers inside a frozen LLM, gated to start as identity. Introduced by Flamingo (2022). Also called: gated xattn, gated cross-attention.
- **Interleaved image–text sequences**: Train and prompt on web pages where images and text alternate, enabling multimodal few-shot learning. Introduced by Flamingo (2022). Also called: interleaved, arbitrarily interleaved.
- **Querying Transformer (Q-Former)**: A lightweight Transformer whose learned queries extract the most text-relevant features from a frozen image encoder. Introduced by BLIP-2 (2023). Also called: q-former, querying transformer, learnable queries.
- **Two-stage vision-to-language bootstrapping**: First align the bridge with vision and text, then teach it to talk to a frozen LLM. Introduced by BLIP-2 (2023). Also called: two stages, representation learning stage, generative learning stage.

## Image captioning

Generating natural-language descriptions of images, and how to evaluate them.

- **Visual word detectors for captioning**: Detect caption words with multiple-instance learning, then compose sentences with an LM. Introduced by Captions to Visual Concepts (2014). Also called: multiple instance learning, word detectors.
- **Region–word visual-semantic alignment**: Align image regions with sentence fragments, then generate descriptions with a multimodal RNN. Introduced by Karpathy visual-semantic alignment (2014). Also called: visual-semantic alignments, multimodal recurrent neural network, m-rnn.
- **Consensus caption metric (CIDEr)**: Score a caption by its TF-IDF n-gram agreement with many human references. Introduced by CIDEr (2014). Also called: cider, consensus-based.
- **Novel object captioning**: Describe objects never seen in the caption training data. Introduced by Learning like a Child (2015). Also called: nocaps, novel concepts, novel object.
- **Constrained beam search**: Force chosen tag words into generated captions at test time, without retraining. Introduced by Constrained beam search captioning (2016). Also called: constrained beam search.
- **Template-and-slot grounded captioning**: Generate a sentence template whose slots are filled by detected objects. Introduced by Neural Baby Talk (2018). Also called: neural baby talk, slot filling.
- **Object-relation graphs for captioning**: Encode semantic and spatial relations between objects with graph convolutions. Introduced by GCN-LSTM captioning (2018). Also called: gcn-lstm, visual relationship.
- **Meshed-memory captioning Transformer**: Memory-augmented region encoding plus mesh connectivity across encoder layers. Introduced by Meshed-Memory Transformer (2019). Also called: meshed-memory, m2 transformer.
- **Bilinear (X-Linear) attention**: Second-order bilinear interactions inside attention for captioning. Introduced by X-Linear attention (2020). Also called: x-linear, bilinear pooling.
- **Semantic concept tokens for captioning**: Detector-free captioning that predicts semantic concepts from ViT grid features. Introduced by ViTCAP (2021). Also called: vitcap, concept tokens.
- **Image-grounded text generation**: Train the model to generate the caption conditioned on the image. Also called: image captioning, captioning loss, language modeling loss.

## Visual question answering & reasoning

Answering questions and reasoning about images in natural language.

- **Open-ended visual question answering**: Answer free-form natural-language questions about an image. Introduced by VQA (2015). Also called: vqa, visual question answering.
- **Symbolic reasoning for visual QA**: Answer questions by reasoning over uncertain scene parses in a probabilistic framework. Introduced by Multi-World QA (2014). Also called: multi-world, visual turing test.
- **End-to-end neural VQA (CNN + LSTM)**: Encode the image with a CNN and the question with an LSTM, and train everything jointly. Introduced by Ask Your Neurons (2015). Also called: neural-image-qa, image qa, mqa.
- **Generating QA pairs from captions**: Turn existing image descriptions into question–answer training data automatically. Introduced by Image QA models & data (2015). Also called: question generation, cocoqa.
- **Balanced VQA against language priors**: Pair every question with images that flip the answer, so models must actually look. Introduced by VQA v2 (2016). Also called: vqa v2, language priors, complementary images.
- **Bilinear attention networks**: Attend over all question-word × image-region pairs with low-rank bilinear pooling. Introduced by Bilinear Attention Networks (2018). Also called: ban, bilinear attention.
- **Grounded visual reasoning**: Decide whether a statement is true of a pair of photos, which requires compositional reasoning. Introduced by NLVR2 (2018). Also called: nlvr2, visual reasoning, compositional.

## Object detection & grounding

Finding objects and linking words or phrases to image regions.

- **Integrated ConvNet localisation & detection**: One shared ConvNet does classification, localisation and detection with dense sliding windows. Introduced by OverFeat (2013). Also called: overfeat, sliding window.
- **Region proposal network**: Predict object proposals from shared conv features, making two-stage detection near real-time. Introduced by Faster R-CNN (2015). Also called: rpn, faster r-cnn, region proposal.
- **Phrase grounding**: Link each phrase in a caption to the image region it mentions. Introduced by Flickr30k Entities (2015). Also called: region-to-phrase, grounding, flickr30k entities.
- **Box attention for visual relationships**: Model subject–object pairs inside a standard detector to find relationships. Introduced by Box Attention (2018). Also called: box attention, visual relationships.
- **Decoupled box proposal & featurisation**: Separate where-boxes-are from what-features-to-extract so more label data can be used. Introduced by Decoupled box proposals captioning (2019). Also called: decoupled box proposal, ultrafine-grained.
- **Attention-unified detection head**: Unify scale, spatial and task awareness in a detector head with three attentions. Introduced by Dynamic Head (2021). Also called: dynamic head.

## Datasets & data curation

How training and evaluation data were collected, cleaned and scaled.

- **Dense image–language annotation**: Human-written regions, attributes and relationships that ground language in images. Introduced by Visual Genome (2016). Also called: region descriptions, scene graphs, dense annotations, crowdsourced.
- **Web-scale image–text pairs**: Hundreds of millions of image–caption pairs scraped from the web. Also called: image-text pairs, web data, conceptual captions, laion, noisy web.
- **CLIP-filtered open datasets**: Use CLIP similarity to filter web pairs into an open, model-ready dataset. Introduced by LAION-400M (2021). Also called: clip-filtered, laion-400m.
- **Diverse curated text corpora**: Mix many high-quality text sources to improve LM generalisation. Introduced by The Pile (2020). Also called: the pile, diverse text.

## Training & optimization

Normalisation, initialisation, regularisation, distillation and optimiser fixes that make training work.

- **Adversarial training in embedding space**: Perturb word or region embeddings adversarially during training to generalise better. Introduced by FreeLB (2019). Also called: freelb, villa, adversarial perturbations.
- **PReLU & He initialisation**: Learnable leaky ReLUs plus an initialisation that lets very deep rectifier nets train from scratch. Introduced by PReLU / He init (2015). Also called: prelu, he initialization, rectifier.
- **Batch normalisation**: Normalise activations per mini-batch to stabilise and speed up training. Introduced by BatchNorm (2015). Also called: batch normalization, batchnorm, internal covariate shift.
- **Knowledge distillation**: Train a small student to match a large teacher's softened predictions. Introduced by Knowledge Distillation (2015). Also called: distillation, soft targets, teacher-student.
- **Label smoothing**: Soften one-hot targets to regularise the classifier. Introduced by Inception v3 (2015). Also called: label smoothing.
- **Large-batch training recipe**: Scale learning rate with batch size and warm up, so huge batches train like small ones. Introduced by Goyal large-batch SGD (2017). Also called: linear scaling rule, warmup, large minibatch.
- **Decoupled weight decay (AdamW)**: Apply weight decay separately from Adam's adaptive step, fixing its regularisation. Introduced by AdamW (2017). Also called: adamw, decoupled weight decay.

## Distributed training & systems

Parallelism and systems tricks for training models too big for one accelerator.

- **Pipeline parallelism**: Split layers across devices and stream micro-batches through them. Introduced by GPipe (2018). Also called: gpipe, pipeline parallelism, micro-batches.
- **Tensor (intra-layer) model parallelism**: Split each layer's matrices across GPUs so one model can be far larger than one device. Introduced by Megatron-LM (2019). Also called: megatron, tensor parallelism, model parallel.
- **Automatic sharding**: Annotate a few tensors and let the compiler shard the whole computation. Introduced by GShard (2020). Also called: gshard, sharding annotations.
- **3D parallelism**: Combine data, tensor and pipeline parallelism to train 500B-parameter models. Introduced by Megatron-Turing NLG (2022). Also called: deepspeed, data, tensor and pipeline.
- **Pathways multi-pod training**: Train one dense model across thousands of chips in multiple TPU pods. Introduced by PaLM (2022). Also called: pathways.

## Sparse & mixture-of-experts models

Conditional computation: activate only part of a huge model for each input.

- **Sparse mixture-of-experts layers**: Route each token to a few of many expert feed-forward layers: huge capacity, constant compute. Introduced by GShard (2020). Also called: mixture of experts, moe, conditional computation, sparsely activated.
- **Top-1 (switch) routing**: Send each token to a single expert, simplifying MoE and scaling to trillions of parameters. Introduced by Switch Transformer (2021). Also called: switch transformer, top-1 routing.

## Benchmarks, evaluation & robustness

How progress is measured, and how models fail under distribution shift.

- **Extractive reading comprehension**: Answer a question by selecting a span from a passage. Introduced by SQuAD (2016). Also called: squad, reading comprehension, answer span.
- **Retriever–reader open-domain QA**: Retrieve documents, then read them to extract an answer. Introduced by DrQA (2017). Also called: drqa, open-domain question answering, machine reading at scale.
- **Broad multitask knowledge benchmarks**: Test models across dozens to hundreds of academic and reasoning tasks at once. Introduced by MMLU (2020). Also called: mmlu, big-bench, massive multitask.
- **True few-shot evaluation**: Evaluate few-shot ability without a hidden validation set used for tuning. Introduced by True few-shot learning (2021). Also called: true few-shot.
- **Natural distribution-shift robustness**: Accuracy drops on new test sets drawn the same way; robustness to such shifts is rare. Introduced by ImageNetV2 (2019). Also called: imagenetv2, distribution shift, effective robustness.
- **Corruption robustness**: Measure accuracy under noise, blur, weather and other common corruptions. Introduced by ImageNet-C (2019). Also called: imagenet-c, common corruptions.
- **Texture vs shape bias**: ImageNet CNNs recognise textures more than shapes, unlike humans. Introduced by ImageNet-trained CNNs are biased towards (2018). Also called: texture bias, shape bias, stylized imagenet.
- **ImageNet accuracy predicts transfer**: Better ImageNet models are, almost linearly, better feature extractors elsewhere. Introduced by Do better ImageNet models transfer better? (2018). Also called: transfer better.

## Discrete & generative image models

Image tokenisers and models that generate images.

- **Discrete visual tokens (VQ-VAE)**: Compress images into a vocabulary of discrete codes so Transformers can model them like text. Introduced by VQ-VAE (2017). Also called: vq-vae, vector quantization, discrete latent, visual tokens.
- **Autoregressive text-to-image Transformer**: Model text and image tokens as one stream and sample images from text. Introduced by DALL·E (2021). Also called: dall-e, text-to-image.
- **ViT-based image tokenizer**: A ViT-based VQGAN gives better image tokens for autoregressive image modelling. Introduced by ViT-VQGAN (2021). Also called: vit-vqgan, vector-quantized image modeling.

## Unified multitask models

One model, one format, many tasks.

- **Text-to-text framing**: Cast every task as text in, text out: one model, one loss. Introduced by T5 (2019). Also called: t5, text-to-text, unified text-to-text.
- **Multi-task vision-language learning**: Train one VL model on many tasks at once and share the representation. Introduced by Multi-task hierarchical VL (2018). Also called: 12-in-1, multi-task, hierarchical vision-language.
- **All VL tasks as text generation**: Answer every vision-language task by generating its label as text. Introduced by VL-T5 (2021). Also called: vl-t5, multimodal conditional text generation.
- **Every task as question answering**: Cast ten NLP tasks as QA over a context so one model handles them all. Introduced by decaNLP (2018). Also called: decanlp.
