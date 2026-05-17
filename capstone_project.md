# Legal Assistants Powered by Agentic RAG
**Student Project Guide - Gen AI Capstone Project**  
*Confidential — For Educational Use Only 2026*

## Skills Covered in This Project
✦ **Gen AI Fundamentals:** Understand how LLMs work in a legal context  
✦ **Prompt Engineering:** Write system/user prompts for legal reasoning  
✦ **Multi-Provider Models:** Compare OpenAI, HuggingFace, DeepSeek, Google AI Studio  
✦ **RAG with LangChain:** Build the retrieval pipeline from scratch  
✦ **Agentic AI:** Build agents with LangChain / LangGraph / N8N / OpenAI Agent Builder  
✦ **Agent Evaluation:** Measure faithfulness, cost, and latency  
✦ **Model Selection:** Use HELM, Artificial Analysis & LLM Arena to pick the best model  

**Project Title:** Legal Assistants Powered by Agentic RAG — Case Law & Contracts  
**Domain:** Legal Technology / AI Engineering  
**Tech Stack:** Python, LangChain, LangGraph, OpenAI API, HuggingFace, DeepSeek, Google AI Studio, FAISS / Chroma / MongoDB Atlas, N8N  
**Duration:** 10 days  
**Deliverable:** Working agent + evaluation report + model selection analysis  

---

## 1. Project Overview
This capstone project challenges you to build a complete, production-like Legal AI Assistant that combines every topic covered in the Gen AI course. You are not just running a demo — you will design, build, evaluate, and optimize a real AI system that legal professionals could use.

The assistant helps lawyers and law students quickly find, analyze, and reason over two core document types:
- **Case Law** — court judgments, precedents, opinions, and legal summaries
- **Contracts** — NDAs, vendor agreements, employment contracts, and playbooks

**Why This Project?**  
Instead of a lawyer spending hours manually searching databases or reading hundreds of pages, the AI assistant retrieves the exact relevant sections from a private document collection and generates clear, cited answers grounded in real text — not hallucinations.

### 1.1 Real-World Context
Legal AI is one of the fastest-growing applications of Gen AI. Tools like Thomson Reuters CoCounsel, Lexis+ AI, and Harvey.ai are already being used at major law firms. This project lets you build your own version using open-source tools and understand exactly how these systems work under the hood.

---

## 2. How Every Course Topic Maps to This Project

| Course Topic | Where You Apply It |
|---|---|
| Gen AI Fundamentals | Explain why RAG reduces hallucinations; how embeddings represent legal text |
| Prompt Engineering | Write system prompts, few-shot examples, chain-of-thought prompts for legal reasoning |
| OpenAI API | Use GPT-4o as the primary LLM in the RAG pipeline |
| HuggingFace Models | Use open-source embeddings (BAAI/bge-base) and compare with OpenAI embeddings |
| DeepSeek | Swap in DeepSeek-V3 as an alternative LLM and benchmark results |
| Google AI Studio | Use Gemini 1.5 Pro for multi-document legal summarization tasks |
| RAG with LangChain | Build the full ingestion + retrieval + generation pipeline |
| LangChain Agents | Wrap the RAG pipeline in a ReAct agent with tools |
| LangGraph Agents | Add memory and multi-step reasoning with a stateful graph |
| N8N Automation | Build a no-code workflow trigger for the agent |
| OpenAI Agent Builder | Create a hosted legal assistant with file search |
| Agent Evaluation | Measure Faithfulness, Cost, Latency, and Task Success Rate |
| HELM Benchmarks | Compare models on legal reasoning tasks using HELM |
| Artificial Analysis | Read model speed vs. quality trade-offs for cost decisions |
| LLM Arena | Interpret human preference rankings for instruction-following |

---

## 3. System Architecture — Agentic RAG Pipeline

### 3.1 Classic RAG (Starting Point)
Start with the basic pipeline before adding agent capabilities:  
📄 Document Loader → ✂️ Text Splitter → 🔢 Embeddings → 🗄️ Vector Store → 🤖 LLM + Prompt

### 3.2 Agentic RAG (Final Goal)
In the agentic version, the LLM can reason, call tools, ask clarifying questions, and retrieve more documents if the first search is insufficient. This is the architecture you will build with LangGraph.

- **Step 1:** User asks a legal question (e.g., 'Can the defendant claim force majeure?')
- **Step 2:** Agent decomposes the question into sub-queries if needed
- **Step 3:** Retriever searches case law AND contracts vector stores in parallel
- **Step 4:** Agent decides: Is the context sufficient? If not → retrieves more
- **Step 5:** LLM generates a cited, structured answer with sources
- **Step 6:** Agent optionally drafts a follow-up clause or counter-argument

---

## 4. Implementation Phases

### PHASE 1: Gen AI Fundamentals + Prompt Engineering
**Understanding the foundations and writing effective legal prompts**
- How transformer-based LLMs generate text (next-token prediction)
- Why LLMs hallucinate — and how RAG addresses this
- What embeddings are — mapping legal text to high-dimensional vectors

### PHASE 2: Multi-Provider Model Exploration + GitHub Copilot
**Compare LLMs and use AI coding tools**
- Using GitHub Copilot Throughout This Project. GitHub Copilot is your AI pair programmer. Use it actively at every step:
  - Write a docstring for your RAG pipeline → Copilot generates the function body
  - Type `# TODO: chunk documents into 800-token chunks` → Copilot autocompletes the LangChain code
  - Write a test case comment → Copilot generates pytest functions
  - Paste a LangChain error message as a comment → Copilot suggests the fix

### PHASE 3: RAG Pipeline with LangChain
**Build the full ingestion and retrieval system**
- **Document Ingestion (Offline Phase):** The first step is to ingest your legal documents into a vector store.
- **Retrieval + Generation (Online Phase):** When User/Lawyer ask model, then starts to convert to embedded vector and search in vector store to find `Top Search Results` and then augment these results with user question and send it to LLM (Generation Model) to generate answer to Lawyer/User.

### PHASE 4: Building the Legal Agent
**LangChain Agents, LangGraph, N8N, OpenAI Agent Builder**
- **Option A — LangChain ReAct Agent:** Wrap your RAG retriever as a tool and let the agent decide when to use it
- **Option B — LangGraph Stateful Agent (Recommended for Full Project):** LangGraph lets your agent maintain memory across turns and loop until it has enough context
- **Option C — N8N No-Code Automation:** Build the same workflow in N8N for students who prefer a visual interface. (Tip: You can run N8N locally with Docker: `docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n`).
- **Option D — OpenAI Agent Builder (Assistants API with File Search):** The simplest production-ready option — upload your legal PDFs directly

### PHASE 5: Agent Evaluation
**Measure faithfulness, Latency, Task Success Rate, and Cost**  
Evaluation is what separates a demo from a production system.
- **Faithfulness:** Does the answer contain only information from retrieved docs?
- **Task Success Rate:** Did agent complete the task? (Measured: Yes/No or %)
- **Latency:** How long did it take? (Measured: Seconds/milliseconds)
- **Cost:** API usage & token consumption (Measured: $ per task)

### PHASE 6: Model Selection: HELM, Artificial Analysis & LLM Arena
**Choose the best model for your legal use case**
- **Using HELM for Legal Benchmarks:** Filter by 'LegalBench' scenario. Compare GPT-4o, Gemini 1.5 Pro, and Mistral-Large.
- **Using Artificial Analysis for Cost/Speed Trade-offs:** Look at Quality Index Score (>70), Output Speed (>50 tokens/sec), Context Window Size (>32K), Cost (<$10/M input), Latency (<2 seconds).
- **Using LLM Arena:** Look at the overall Elo score, filter by 'instruction following' and 'coding'.

---

## 5. Legal Case Examples & Test Scenarios

### Case 1 — Force Majeure in Supply Chain Contracts
- **Case Facts:** Alpha Corp (buyer) and BetaSupply (supplier) signed a 3-year supply agreement in 2018. In 2020, BetaSupply failed to deliver components due to factory shutdowns caused by COVID-19. The contract includes a force majeure clause listing 'natural disasters, acts of God, and governmental action' but does not mention pandemics.
- **Legal Issues:** 1) Does COVID-19 qualify as force majeure under this clause? 2) Does the doctrine of frustration of purpose apply? 3) What damages, if any, can Alpha Corp claim?
- **Query for RAG:** "Does COVID-19 qualify as force majeure under a supply contract clause listing natural disasters and governmental action?"

### Case 2 — Non-Compete Clause Enforceability
- **Case Facts:** A software engineer in California signed an employment agreement with a 2-year, nationwide non-compete clause preventing work for any competitor in the SaaS industry. She resigned and joined a competitor in Texas. The original employer seeks an injunction.
- **Legal Issues:** 1) Is the non-compete enforceable under California law (Bus & Prof Code §16600)? 2) Does Texas choice-of-law provision override California's public policy? 3) Can the employer seek injunctive relief?
- **Query for RAG:** "Enforceability of non-compete clauses under California Business and Professions Code Section 16600 for tech employees"

### Case 3 — GDPR Data Breach Liability
- **Case Facts:** A European fintech company suffered a data breach exposing 500,000 customer records. Their cloud vendor processed the data under a data processing agreement (DPA). The DPA states the vendor implements 'industry-standard security measures' but does not specify encryption requirements. Customers are filing a class action.
- **Legal Issues:** 1) Is the vendor a data processor or joint controller under GDPR? 2) Does 'industry-standard security' satisfy Article 32 technical safeguards? 3) What is the maximum fine under Article 83? 4) Can liability be limited by the DPA's liability cap?
- **Query for RAG:** "GDPR Article 32 security obligations for cloud data processors and liability under data processing agreements"

### Case 4 — Intellectual Property Ownership in Employment
- **Case Facts:** A data scientist employed full-time developed a machine learning algorithm during evenings on her personal laptop, using her own resources. The employer claims ownership under a standard IP assignment clause in her employment contract that assigns 'all inventions conceived during employment.'
- **Legal Issues:** 1) Does the employer's IP clause cover inventions developed on personal time with personal resources? 2) Do California Labor Code §§2870-2872 carve-out protections apply? 3) Is the IP clause overbroad and potentially unenforceable?
- **Query for RAG:** "Employee IP assignment clause enforceability for inventions developed on personal time under California Labor Code 2870"

### Case 5 — Liquidated Damages vs. Penalty Clauses
- **Case Facts:** An e-commerce platform contracted a logistics company to deliver 10,000 packages during peak holiday season. The contract included a liquidated damages clause of $50 per package per day of delay. The logistics company was 5 days late on 8,000 packages, resulting in a $2,000,000 damages claim.
- **Legal Issues:** 1) Is the $50/package/day clause a genuine pre-estimate of loss (liquidated damages) or an unenforceable penalty? 2) What was the actual loss to the platform? 3) How do English courts (Cavendish Square) vs US courts assess this?
- **Query for RAG:** "Liquidated damages clause enforceability test genuine pre-estimate of loss versus unenforceable penalty clause"

### Case 6 — SaaS Subscription Auto-Renewal Dispute
- **Case Facts:** A startup was automatically charged $120,000 for a third year of a SaaS enterprise subscription. They claim they were unaware of the auto-renewal clause, which required written cancellation 90 days before renewal. The clause was in Section 12.4 of a 40-page contract signed electronically.
- **Legal Issues:** 1) Is the auto-renewal clause enforceable if it was buried in the contract? 2) Does the electronic signature satisfy Statute of Frauds? 3) Do consumer protection / B2B contract laws require conspicuous notice of auto-renewal?
- **Query for RAG:** "Auto-renewal clause enforceability conspicuous notice requirement SaaS enterprise contracts electronic signature"

### Case 7 — Wrongful Termination and At-Will Employment
- **Case Facts:** An employee was terminated after raising safety concerns about a product defect to the CEO. The company claims termination was for performance reasons and cites documented performance improvement plans. The employee alleges the PIPs were fabricated and the real reason was retaliation for whistleblowing.
- **Legal Issues:** 1) Does the employee have a whistleblower retaliation claim? 2) What standard of proof is required? 3) Do Sarbanes-Oxley or Dodd-Frank whistleblower protections apply to this private company? 4) Is the at-will employment doctrine overcome?
- **Query for RAG:** "Whistleblower retaliation wrongful termination at-will employment exceptions Sarbanes-Oxley private company"

### Case 8 — Construction Contract Disputes: Scope Creep
- **Case Facts:** A general contractor signed a fixed-price construction contract for $5M to build a commercial office. During construction, the owner requested 23 additional change orders valued at $1.2M. The contractor completed all changes but the owner refuses to pay, arguing the changes were within the original scope.
- **Legal Issues:** 1) What constitutes a valid change order under AIA contract terms? 2) Does verbal instruction from the owner constitute a binding change order? 3) Can the contractor claim unjust enrichment for completed but disputed work? 4) What is the standard for scope interpretation?
- **Query for RAG:** "Construction contract change order validity verbal instructions scope of work dispute unjust enrichment"

### Case 9 — Confidentiality Breach and Trade Secrets
- **Case Facts:** A departing VP of Sales emailed himself a list of 5,000 enterprise customer contacts, pricing structures, and deal pipeline information before leaving. He joined a direct competitor and used this data to approach the former employer's clients. The former employer seeks injunctive relief.
- **Legal Issues:** 1) Does the customer list qualify as a trade secret under the Defend Trade Secrets Act (DTSA)? 2) Is the NDA's confidentiality clause broad enough to cover this data? 3) What remedies are available — injunction, damages, attorney's fees?
- **Query for RAG:** "Trade secret misappropriation customer list Defend Trade Secrets Act injunctive relief departing employee"

### Case 10 — Arbitration Clause Unconscionability
- **Case Facts:** A consumer signed an online terms of service agreement containing a mandatory arbitration clause with a class action waiver. The consumer is part of a class alleging systematic overcharging of $15 per month over 3 years. Individual arbitration would cost more than any individual's recovery.
- **Legal Issues:** 1) Is the arbitration clause unconscionable where individual recovery is less than arbitration costs? 2) Does AT&T Mobility v. Concepcion preclude unconscionability challenges to class waivers? 3) Is there a public policy exception for claims that cannot practically be brought in individual arbitration?
- **Query for RAG:** "Mandatory arbitration clause class action waiver unconscionability consumer contracts small value claims"

---

## 6. Recommended Technology Stack
| Component | Recommended Option | Free Alternative | Why |
|---|---|---|---|
| LLM (Primary) | OpenAI GPT-4o | DeepSeek-V3 or Ollama (local) | Best instruction-following; LangChain native support |
| LLM (Long Context) | Google Gemini 1.5 Pro | Claude 3.5 Sonnet | 1M token context window for full contracts |
| Embeddings | OpenAI text-embedding-3-large | BAAI/bge-base-en-v1.5 (HuggingFace) | Best quality for legal terminology similarity |
| Vector Store | FAISS (local) | Chroma (local) or Pinecone (cloud) | Fast, easy local development; no account needed |
| Agent Framework | LangGraph | LangChain AgentExecutor | Stateful, handles complex multi-step legal reasoning |
| No-Code Automation | N8N (self-hosted) | Zapier + OpenAI Integration | Visual workflow; shows same pipeline without code |
| PDF Loading | PyMuPDF (fitz) | PyPDFLoader (LangChain) | Handles complex legal PDF formatting better |
| IDE | VS Code + GitHub Copilot | JupyterLab + Copilot | Copilot integration is central to Phase 2 |

---

## 7. Security, Ethics & Legal Compliance

**⚠ Critical Warning**  
This project uses simulated legal documents only. NEVER upload real client documents, privileged communications, or confidential legal files to any cloud API (OpenAI, HuggingFace, Google). For real deployments, legal AI must comply with attorney-client privilege, bar association ethics rules, and data protection laws.

**Risk Mitigation in This Project**
- **LLM Hallucination of Cases:** RAG grounding + faithfulness < 1.0 flag + human lawyer review requirement
- **Client Data Privacy:** Use only public domain legal documents or synthetic data in this project
- **Unauthorized Practice of Law:** System prompt: 'This is research assistance only. Consult a licensed attorney.'
- **Model Bias:** Test across multiple jurisdictions; flag when model only cites US precedents for non-US questions
- **API Key Exposure:** Store all keys in `.env` files; add `.env` to `.gitignore`; use GitHub Secrets for CI/CD
- **Prompt Injection:** Sanitize user inputs; implement defensive system prompt

*Good luck building your Legal AI Assistant! You are building the same type of system that is transforming the legal industry. Every line of code you write and every evaluation metric you record is real-world engineering experience.*
