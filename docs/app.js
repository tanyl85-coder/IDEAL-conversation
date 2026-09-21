const STORAGE_KEY = "ideal-growth-prototype-v1";

const steps = {
  officer: [
    ["situation", "What matters now"],
    ["focus", "Choose focus"],
    ["reflect", "Reflect"],
    ["conversation", "Shared conversation"],
    ["plan", "Growth plan"],
    ["review", "Review journey"],
  ],
  supervisor: [
    ["overview", "Officer overview"],
    ["prepare", "Prepare"],
    ["conversation", "Shared conversation"],
    ["plan", "Support the plan"],
    ["review", "Review journey"],
  ],
};

const blankState = () => ({
  started: false,
  persona: "officer",
  step: "situation",
  level: 0,
  aspiration: "",
  context: "",
  question: "",
  scenario: "",
  selected: [],
  discussion: [],
  focusStatus: {},
  reflections: {},
  supervisorSuggestion: null,
  sharedObservation: "",
  officerResponse: "",
  actions: [],
  practiceNotes: [],
  agreed: false,
  createdAt: new Date().toISOString(),
  agreedAt: "",
  events: [],
});

let framework;
let scenarios;
let state = loadState();
let activeReflection = "";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
const today = () => new Date().toISOString().slice(0, 10);
const formatDate = (value) => value ? new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "";
const attr = (id) => framework.attributes.find((item) => item.id === id);
const scenario = () => scenarios.find((item) => item.id === state.scenario);

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && typeof saved === "object" ? { ...blankState(), ...saved } : blankState();
  } catch {
    return blankState();
  }
}

function saveState(message = "Saved on this device") {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const save = $("#save-state");
  if (save) save.textContent = message;
}

function addEvent(label, detail = "") {
  state.events.unshift({ date: new Date().toISOString(), label, detail });
}

function toast(message) {
  const node = $("#toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("show"), 2600);
}

function descriptor(id) {
  return attr(id)?.descriptors?.[state.level] || "";
}

function levelName() {
  return framework.levels[state.level];
}

function activeSelected() {
  return state.selected.filter((id) => !["Paused", "Moved on"].includes(state.focusStatus[id]?.status));
}

function currentSteps() {
  return steps[state.persona];
}

function validStep() {
  const list = currentSteps().map(([id]) => id);
  if (!list.includes(state.step)) state.step = list[0][0];
}

function isComplete(step) {
  if (step === "situation" || step === "overview") return Boolean(state.context || state.scenario);
  if (step === "focus") return state.selected.length >= 3;
  if (step === "reflect") return state.discussion.some((id) => state.reflections[id]?.evidence);
  if (step === "conversation" || step === "prepare") return Boolean(state.sharedObservation || state.supervisorSuggestion);
  if (step === "plan") return state.actions.some((item) => item.behaviour);
  if (step === "review") return state.practiceNotes.length > 0 || state.agreed;
  return false;
}

function renderNav() {
  const nav = $("#step-nav");
  nav.innerHTML = currentSteps().map(([id, label], index) => `
    <button class="step-button ${state.step === id ? "active" : ""} ${isComplete(id) ? "complete" : ""}" data-step="${id}">
      <span>${isComplete(id) ? "✓" : index + 1}</span><span>${label}</span>
    </button>
  `).join("");
  $$("[data-persona]").forEach((button) => button.classList.toggle("active", button.dataset.persona === state.persona));
  $("#level-select").value = String(state.level);
}

function pageHeading(kicker, title, copy, status = null) {
  return `<div class="page-heading"><div><span class="eyebrow">${esc(kicker)}</span><h1>${esc(title)}</h1><p>${esc(copy)}</p></div>${status ? `<span class="status-badge">${esc(status)}</span>` : ""}</div>`;
}

function footer(previous, next, nextLabel = "Continue") {
  return `<div class="flow-footer">
    <button class="button ghost" data-step="${previous}" ${previous ? "" : "disabled"}>Back</button>
    <button class="button primary" data-step="${next}" ${next ? "" : "disabled"}>${esc(nextLabel)}</button>
  </div>`;
}

function renderWelcome() {
  return `<section class="panel welcome">
    <div class="welcome-grid">
      <div class="welcome-copy">
        <span class="eyebrow">IDEAL GROWTH CONVERSATIONS</span>
        <h1>Turn reflection into a <em>small experiment</em>.</h1>
        <p>Explore a realistic situation, identify the IDEAL attributes at play and prepare for a focused development conversation.</p>
      </div>
      <div class="welcome-setup">
        <span class="eyebrow">START TESTING</span>
        <h2>Choose your leadership level</h2>
        <p>The official descriptor shown throughout the journey will match this level.</p>
        <label class="field"><span>Leadership level</span><select id="welcome-level">${framework.levels.map((level, i) => `<option value="${i}" ${state.level === i ? "selected" : ""}>${esc(level)}</option>`).join("")}</select></label>
        <button class="button primary full" data-action="start">Begin as an officer</button>
        <ul class="feature-list"><li>20 fictional guided scenarios</li><li>Officer and supervisor perspectives</li><li>Focus updates, practical actions and journey history</li><li>Device-only saving and easy reset</li></ul>
      </div>
    </div>
  </section>`;
}

function renderSituation() {
  const levelScenarios = scenarios.filter((item) => item.level === state.level);
  const chosen = scenario();
  return `${pageHeading("OFFICER · STEP 1", "What matters now?", "Start with a real aspiration or challenge. You can write your own or use a fictional scenario to explore the journey.", "Private preparation")}
    <section class="panel accent">
      <h2>Describe the difference you want to make</h2>
      <label class="field"><span>What are you hoping to achieve?</span><textarea data-bind="aspiration" placeholder="For example: I want the team to take greater ownership while maintaining quality.">${esc(state.aspiration)}</textarea></label>
      <label class="field"><span>What situation is making this important now?</span><textarea data-bind="context" placeholder="Describe one recent situation, what you did and what happened.">${esc(state.context)}</textarea></label>
      <label class="field"><span>What would make the conversation useful?</span><input data-bind="question" value="${esc(state.question)}" placeholder="A question you want to explore with your supervisor" /></label>
    </section>
    <section class="panel">
      <div class="panel-heading"><div><span class="eyebrow">GUIDED SCENARIOS</span><h2>Choose the closest fictional situation</h2><p>These curated examples are guidance. They are not AI analysis of what you write.</p></div></div>
      <div class="scenario-grid">${levelScenarios.map((item) => `<button class="scenario-card ${state.scenario === item.id ? "selected" : ""}" data-scenario="${item.id}"><strong>${esc(item.title)}</strong><p>${esc(item.story)}</p><span>${state.scenario === item.id ? "Selected" : "Explore this scenario"}</span></button>`).join("")}</div>
      ${chosen ? `<div class="scenario-detail"><h3>${esc(chosen.title)}</h3><p><strong>Strength already present:</strong> ${esc(chosen.strength)}</p><p><strong>Possible balance:</strong> ${esc(chosen.balance)}</p><p><strong>Check the context:</strong> ${esc(chosen.barrier)}</p><ol class="question-list">${chosen.questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ol><div class="button-row"><button class="button secondary" data-action="use-scenario-focus">Use the suggested attributes</button><button class="button ghost" data-action="clear-scenario">None of these fits</button></div></div>` : ""}
    </section>
    ${footer("", "focus", "Choose my focus")}`;
}

function selectionSummary() {
  if (!state.selected.length) return `<div class="selection-summary"><strong>No focus attributes selected yet</strong><span class="helper">Choose 3–5 for this development cycle.</span></div>`;
  return `<div class="selection-summary"><strong>${state.selected.length}/5 selected</strong>${state.selected.map((id) => `<span class="chip ${state.focusStatus[id]?.status === "Paused" ? "paused" : state.focusStatus[id]?.status === "Moved on" ? "moved" : ""}">${esc(attr(id)?.name)}<button data-remove-attribute="${id}" aria-label="Remove ${esc(attr(id)?.name)}">×</button></span>`).join("")}</div>`;
}

function renderFocus() {
  return `${pageHeading("OFFICER · STEP 2", "Choose your development focus", "Select 3–5 attributes for this development cycle, then highlight up to two for the next conversation.", `${state.selected.length}/5 selected`)}
    ${selectionSummary()}
    <section class="panel">
      <div class="panel-heading"><div><h2>IDEAL attributes</h2><p>Select the attributes that matter most in your current work.</p></div></div>
      <div class="attribute-grid">${framework.attributes.map((item) => {
        const selected = state.selected.includes(item.id);
        const linked = scenario()?.links?.some(([id]) => id === item.id);
        return `<article class="attribute-card ${selected ? "selected" : ""}"><span class="trait">${esc(item.trait)}${linked ? " · SCENARIO LINK" : ""}</span><h3>${esc(item.name)}</h3><p>${esc(item.descriptors[state.level])}</p><button class="button ${selected ? "secondary" : "ghost"}" data-attribute="${item.id}">${selected ? "Selected" : "Add to my focus"}</button></article>`;
      }).join("")}</div>
    </section>
    <section class="panel subtle"><h2>Choose this conversation’s focus · up to 2</h2><p>These are the attributes you will reflect on more deeply now.</p><div class="button-row">${state.selected.map((id) => `<button class="button ${state.discussion.includes(id) ? "secondary" : "ghost"}" data-discussion="${id}">${state.discussion.includes(id) ? "✓ " : ""}${esc(attr(id)?.name)}</button>`).join("") || `<span class="helper">Select your cycle focus above first.</span>`}</div></section>
    ${footer("situation", "reflect", "Reflect on my focus")}`;
}

function ensureReflection(id) {
  state.reflections[id] ||= { rating: "", evidence: "", pattern: "Build on", exploration: "", supervisorRating: "", supervisorNote: "" };
  return state.reflections[id];
}

function renderReflect() {
  const ids = state.discussion.length ? state.discussion : state.selected.slice(0, 2);
  activeReflection = ids.includes(activeReflection) ? activeReflection : ids[0] || "";
  if (!activeReflection) return `${pageHeading("OFFICER · STEP 3", "Reflect on a recent example", "Choose one or two attributes for this conversation before reflecting.")}
    <section class="panel"><h2>No conversation focus selected</h2><p>Return to Choose focus and select up to two attributes.</p><button class="button primary" data-step="focus">Choose focus</button></section>`;
  const item = attr(activeReflection);
  const reflection = ensureReflection(activeReflection);
  const ratings = ["Small extent", "Moderate extent", "Large extent", "Not enough opportunity to observe"];
  return `${pageHeading("OFFICER · STEP 3", "Reflect before rating", "Use one recent example. Consider your intention, behaviour, impact and the conditions around the situation.", "Private until shared")}
    <div class="reflection-tabs">${ids.map((id) => `<button class="${activeReflection === id ? "active" : ""}" data-reflection="${id}">${esc(attr(id)?.name)}</button>`).join("")}</div>
    <section class="panel accent">
      <span class="eyebrow">${esc(item.trait)} · ${esc(levelName())}</span><h2>${esc(item.name)}</h2>
      <blockquote class="descriptor">${esc(descriptor(item.id))}</blockquote>
      <label class="field"><span>What happened? What did you do, and what was the effect?</span><textarea data-reflection-bind="evidence" placeholder="A specific recent example…">${esc(reflection.evidence)}</textarea></label>
      <div class="field"><span>Based on this example, to what extent did you demonstrate the descriptor?</span><div class="rating-options">${ratings.map((rating) => `<label><input type="radio" name="rating" value="${esc(rating)}" ${reflection.rating === rating ? "checked" : ""}/>${esc(rating)}</label>`).join("")}</div></div>
      <label class="field"><span>Which perspective is most useful to explore?</span><select data-reflection-bind="pattern"><option ${reflection.pattern === "Build on" ? "selected" : ""}>Build on</option><option ${reflection.pattern === "Possible overplay" ? "selected" : ""}>Possible overplay</option><option ${reflection.pattern === "Possible underplay" ? "selected" : ""}>Possible underplay</option></select></label>
      <label class="field"><span>What strength helped? What barrier or trade-off may also be present?</span><textarea data-reflection-bind="exploration" placeholder="Consider strengths, workload, confidence, opportunity, expectations or the way work is organised.">${esc(reflection.exploration)}</textarea></label>
    </section>
    ${footer("focus", "conversation", "Prepare for the conversation")}`;
}

function suggestionCard() {
  const suggestion = state.supervisorSuggestion;
  if (!suggestion) return `<p class="helper">Your supervisor has not suggested another focus attribute in this prototype.</p>`;
  return `<article class="suggestion"><strong>Supervisor suggests: ${esc(attr(suggestion.attribute)?.name)}</strong><p>${esc(suggestion.reason)}</p><small>Suggested ${formatDate(suggestion.date)} · ${esc(suggestion.status)}</small>${state.persona === "officer" ? `<div class="suggestion-actions"><button class="button secondary" data-suggestion-response="Add to our discussion">Add to our discussion</button><button class="button ghost" data-suggestion-response="Discuss before deciding">Discuss before deciding</button><button class="button ghost" data-suggestion-response="Suggest a different focus">Suggest a different focus</button></div>` : ""}</article>`;
}

function renderConversation() {
  const isSupervisor = state.persona === "supervisor";
  return `${pageHeading(`${isSupervisor ? "SUPERVISOR" : "OFFICER"} · SHARED CONVERSATION`, isSupervisor ? "Continue the shared conversation" : "Bring your supervisor into the conversation", isSupervisor ? "Review the officer’s perspective, add a concrete observation and explore a focus together." : "Share what you want to explore. Different perspectives can remain visible without forcing identical ratings.", state.agreed ? "Plan agreed" : "Shared for discussion")}
    <section class="panel"><div class="perspective-grid">
      <article class="perspective"><span class="eyebrow">OFFICER’S PERSPECTIVE</span><h3>${esc(state.aspiration || "Development aspiration")}</h3><p>${esc(state.context || "No situation has been recorded yet.")}</p>${state.question ? `<small>Conversation question: ${esc(state.question)}</small>` : ""}</article>
      <article class="perspective"><span class="eyebrow">SUPERVISOR’S PERSPECTIVE</span><h3>${isSupervisor ? "Your observation" : "Supervisor observation"}</h3>${isSupervisor ? `<label class="field"><span>What have you observed, and what was the effect?</span><textarea data-bind="sharedObservation" placeholder="I noticed… The effect seemed to be…">${esc(state.sharedObservation)}</textarea></label>` : `<p>${esc(state.sharedObservation || "No observation has been added yet. Switch to Supervisor to test this part of the journey.")}</p>`}</article>
    </div></section>
    <section class="panel"><div class="panel-heading"><div><h2>Suggested focus</h2><p>A supervisor suggestion stays a proposal until it is discussed.</p></div></div>${suggestionCard()}
      ${isSupervisor ? `<div class="two-column"><label class="field"><span>Suggest an IDEAL attribute</span><select id="suggestion-attribute"><option value="">Choose an attribute</option>${framework.attributes.map((item) => `<option value="${item.id}" ${state.supervisorSuggestion?.attribute === item.id ? "selected" : ""}>${esc(item.name)}</option>`).join("")}</select></label><label class="field"><span>What have you observed, and what difference could developing this make?</span><textarea id="suggestion-reason" placeholder="Use a concrete example.">${esc(state.supervisorSuggestion?.reason || "")}</textarea></label></div><button class="button secondary" data-action="save-suggestion">Save suggestion</button>` : state.supervisorSuggestion ? `<label class="field"><span>Your response</span><textarea data-bind="officerResponse" placeholder="What fits, what does not, and what would you like to discuss?">${esc(state.officerResponse)}</textarea></label>` : ""}
    </section>
    ${footer(isSupervisor ? "prepare" : "reflect", "plan", isSupervisor ? "Support the plan" : "Agree a practical action")}`;
}

const supervisorStages = [
  ["Prepare with curiosity", ["What have you directly observed, and what are you assuming?", "When has this officer handled something similar well?", "What might your expectations, decisions or support be contributing?"]],
  ["Listen before interpreting", ["Ask what would make this conversation useful.", "Invite one incident: what happened, what did the officer do and what followed?", "Reflect back what you heard and ask what you may have missed."]],
  ["Explore strengths and causes", ["What strength helped, and when might it need a different balance?", "Is the barrier skill, confidence, habit, opportunity, workload or work design?", "Offer an observation: I noticed X; the effect seemed to be Y. How did you experience it?"]],
  ["Agree a small experiment", ["What is one behaviour worth testing in real work?", "What will you do to support it or remove an obstacle?", "Who can give useful feedback, and when will you revisit what happened?"]],
  ["Follow through", ["Ask what was tried before judging the outcome.", "Distinguish lack of opportunity from lack of progress.", "Recognise learning, adjust the experiment and check your promised support."]],
];

function renderSupervisorOverview() {
  return `${pageHeading("SUPERVISOR · OVERVIEW", "Understand what the officer wants to explore", "Begin with the officer’s challenge or aspiration, then review their current focus and reflections.", "Supervisor view")}
    <section class="panel accent"><span class="eyebrow">OFFICER’S CONTEXT</span><h2>${esc(state.aspiration || "No aspiration recorded yet")}</h2><p>${esc(state.context || "Ask the officer to complete the first step or work through it together.")}</p>${state.question ? `<div class="descriptor"><strong>What the officer wants to explore:</strong> ${esc(state.question)}</div>` : ""}</section>
    <section class="panel"><h2>Current development focus</h2><div class="button-row">${state.selected.map((id) => `<span class="chip">${esc(attr(id)?.name)}</span>`).join("") || `<span class="helper">No attributes selected yet.</span>`}</div></section>
    ${footer("", "prepare", "Prepare for the conversation")}`;
}

function renderPrepare() {
  const chosen = scenario();
  return `${pageHeading("SUPERVISOR · PRIVATE PREPARATION", "Prepare with curiosity", "Use these prompts to check assumptions and plan the conversation. Observations and commitments belong in the shared conversation.", "Visible only in this view")}
    <div class="private-note"><strong>Private preparation</strong><p>This page helps you think. It does not create a second assessment record.</p></div>
    <section class="panel">${supervisorStages.map(([title, prompts], index) => `<details class="prompt-stage" ${index === 0 ? "open" : ""}><summary>${index + 1}. ${esc(title)}</summary><ul>${prompts.map((prompt) => `<li>${esc(prompt)}</li>`).join("")}</ul></details>`).join("")}</section>
    ${chosen ? `<section class="panel subtle"><span class="eyebrow">SCENARIO LENS</span><h2>${esc(chosen.title)}</h2><p><strong>Assumption to check:</strong> ${esc(chosen.barrier)}</p><p><strong>Possible support:</strong> ${esc(chosen.support)}</p><p><strong>Review question:</strong> ${esc(chosen.review)}</p></section>` : ""}
    ${footer("overview", "conversation", "Continue the shared conversation")}`;
}

function actionEditor(item, index) {
  return `<article class="action-card"><div class="action-card-heading"><h3>Growth action ${index + 1}</h3><button class="button ghost danger" data-remove-action="${item.id}">Remove</button></div>
    <div class="two-column"><label class="field"><span>Primary IDEAL attribute</span><select data-action-bind="attribute" data-action-id="${item.id}"><option value="">Choose an attribute</option>${state.selected.map((id) => `<option value="${id}" ${item.attribute === id ? "selected" : ""}>${esc(attr(id)?.name)}</option>`).join("")}</select></label><label class="field"><span>Review date</span><input type="date" data-action-bind="date" data-action-id="${item.id}" value="${esc(item.date || "")}" /></label></div>
    <label class="field"><span>What behaviour will you test?</span><textarea data-action-bind="behaviour" data-action-id="${item.id}" placeholder="One small, observable behaviour…">${esc(item.behaviour)}</textarea></label>
    <label class="field"><span>Where will you practise it?</span><input data-action-bind="opportunity" data-action-id="${item.id}" value="${esc(item.opportunity)}" placeholder="A meeting, project, review or assignment" /></label>
    <div class="two-column"><label class="field"><span>What progress could be observed?</span><textarea data-action-bind="success" data-action-id="${item.id}" placeholder="A concrete signal…">${esc(item.success)}</textarea></label><label class="field"><span>What supervisor support would help?</span><textarea data-action-bind="support" data-action-id="${item.id}" placeholder="Feedback, rehearsal, access, priorities…">${esc(item.support)}</textarea></label></div>
  </article>`;
}

function renderPlan() {
  const isSupervisor = state.persona === "supervisor";
  return `${pageHeading(`${isSupervisor ? "SUPERVISOR" : "OFFICER"} · GROWTH PLAN`, isSupervisor ? "Support a small workplace experiment" : "Agree one or two practical actions", isSupervisor ? "Clarify what support you will provide and how progress will be reviewed." : "Keep the experiment small enough to try in real work, with a clear opportunity and observable signal.", state.agreed ? "Agreed" : "Draft plan")}
    <section class="panel accent"><div class="panel-heading"><div><h2>Current experiments</h2><p>An action may support more than one IDEAL attribute.</p></div><span class="status-badge">${state.actions.length}/2 actions</span></div>
      ${state.actions.map(actionEditor).join("") || `<div class="scenario-detail"><h3>Start with one small experiment</h3><p>${esc(scenario()?.experiment || "Choose one behaviour you can practise in a real work situation.")}</p></div>`}
      <button class="button secondary" data-action="add-action" ${state.actions.length >= 2 ? "disabled" : ""}>+ Add a growth action</button>
    </section>
    <section class="panel subtle"><h2>Agreement</h2><p>Agreement confirms the conversation and current plan. It does not require identical ratings or perspectives.</p><div class="button-row"><button class="button ${state.agreed ? "secondary" : "primary"}" data-action="toggle-agreement">${state.agreed ? "✓ Plan agreed — reopen" : "Confirm the agreed plan"}</button></div></section>
    ${footer("conversation", "review", "Review the journey")}`;
}

function renderReview() {
  const isSupervisor = state.persona === "supervisor";
  return `${pageHeading(`${isSupervisor ? "SUPERVISOR" : "OFFICER"} · REVIEW`, isSupervisor ? "Review practice and support" : "Keep the journey current", isSupervisor ? "Ask what was tried, what changed and whether the promised support was provided." : "Add a brief practice note, pause a focus area or move on when enough progress has been made.", state.agreed ? "Current plan agreed" : "Plan in progress")}
    <section class="panel accent"><h2>Current focus</h2><div class="button-row">${state.selected.map((id) => `<span class="chip ${state.focusStatus[id]?.status === "Paused" ? "paused" : state.focusStatus[id]?.status === "Moved on" ? "moved" : ""}">${esc(attr(id)?.name)} · ${esc(state.focusStatus[id]?.status || "Active")}</span>`).join("") || `<span class="helper">No focus selected yet.</span>`}</div>
      ${!isSupervisor && state.selected.length ? `<div class="two-column"><label class="field"><span>Update a focus area</span><select id="focus-update-attribute"><option value="">Choose an attribute</option>${state.selected.map((id) => `<option value="${id}">${esc(attr(id)?.name)}</option>`).join("")}</select></label><label class="field"><span>New status</span><select id="focus-update-status"><option>Active</option><option>Paused</option><option>Moved on</option></select></label></div><label class="field"><span>Why is the focus changing?</span><input id="focus-update-reason" placeholder="New assignment, progress, feedback or changing priorities" /></label><button class="button secondary" data-action="update-focus-status">Save focus update</button>` : ""}
    </section>
    <section class="panel"><h2>${isSupervisor ? "Review question" : "Add a practice note"}</h2><p>${esc(scenario()?.review || "What did you try, what happened and what will you retain or change?")}</p>${!isSupervisor ? `<label class="field"><span>What did you try, and what did you learn?</span><textarea id="practice-note" placeholder="A brief note from real work…"></textarea></label><button class="button secondary" data-action="add-practice-note">Add to journey</button>` : `<p class="helper">Discuss the most recent note and check what support is needed next.</p>`}
      ${state.practiceNotes.length ? `<div class="timeline">${state.practiceNotes.map((note) => `<div class="timeline-item"><strong>${formatDate(note.date)}</strong><small>${esc(note.text)}</small></div>`).join("")}</div>` : ""}</section>
    <section class="panel subtle"><h2>Journey history</h2><div class="timeline">${historyEvents().map((event) => `<div class="timeline-item"><strong>${esc(event.label)}</strong><small>${formatDate(event.date)}${event.detail ? ` · ${esc(event.detail)}` : ""}</small></div>`).join("")}</div></section>
    <div class="button-row"><button class="button primary" data-action="open-feedback">Give feedback on the prototype</button><button class="button ghost" data-action="export-journey">Download my test journey</button></div>
    ${footer("plan", "", "")}`;
}

function historyEvents() {
  const base = [{ date: state.createdAt, label: "Test journey created", detail: levelName() }];
  if (state.selected.length) base.push({ date: state.events.find((e) => e.label === "Focus selected")?.date || state.createdAt, label: "Development focus selected", detail: `${state.selected.length} attributes` });
  if (state.agreedAt) base.push({ date: state.agreedAt, label: "Plan agreed", detail: `${state.actions.length} action${state.actions.length === 1 ? "" : "s"}` });
  return [...state.events.filter((event) => !["Focus selected"].includes(event.label)), ...base].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function render() {
  validStep();
  renderNav();
  const main = $("#main");
  if (!state.started) main.innerHTML = renderWelcome();
  else {
    const views = {
      situation: renderSituation,
      focus: renderFocus,
      reflect: renderReflect,
      overview: renderSupervisorOverview,
      prepare: renderPrepare,
      conversation: renderConversation,
      plan: renderPlan,
      review: renderReview,
    };
    main.innerHTML = (views[state.step] || views[currentSteps()[0][0]])();
  }
  bindDynamicInputs();
}

function bindDynamicInputs() {
  $$('[data-bind]').forEach((input) => input.addEventListener("input", () => {
    state[input.dataset.bind] = input.value;
    saveState();
  }));
  $$('[data-reflection-bind]').forEach((input) => input.addEventListener("input", () => {
    ensureReflection(activeReflection)[input.dataset.reflectionBind] = input.value;
    saveState();
  }));
  $$('input[name="rating"]').forEach((input) => input.addEventListener("change", () => {
    ensureReflection(activeReflection).rating = input.value;
    saveState();
  }));
  $$('[data-action-bind]').forEach((input) => input.addEventListener("input", () => {
    const action = state.actions.find((item) => item.id === input.dataset.actionId);
    if (action) action[input.dataset.actionBind] = input.value;
    saveState();
  }));
}

function navigate(step) {
  if (!step) return;
  if (state.step === "focus" && step === "reflect" && state.selected.length < 3) {
    toast("Choose at least three focus attributes for this development cycle.");
    return;
  }
  if (state.step === "focus" && step === "reflect" && state.discussion.length === 0) {
    toast("Choose one or two attributes for this conversation.");
    return;
  }
  state.started = true;
  state.step = step;
  saveState();
  render();
  $("#main").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setPersona(persona) {
  state.persona = persona;
  state.started = true;
  state.step = persona === "supervisor" ? "overview" : "situation";
  saveState();
  render();
}

function selectAttribute(id) {
  if (state.selected.includes(id)) {
    state.selected = state.selected.filter((item) => item !== id);
    state.discussion = state.discussion.filter((item) => item !== id);
  } else if (state.selected.length < 5) {
    state.selected.push(id);
    ensureReflection(id);
  } else toast("Choose no more than five focus attributes.");
  if (state.selected.length >= 3 && !state.events.some((event) => event.label === "Focus selected")) addEvent("Focus selected", `${state.selected.length} attributes`);
  saveState();
  render();
}

function addAction() {
  if (state.actions.length >= 2) return;
  state.actions.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), attribute: state.discussion[0] || state.selected[0] || "", behaviour: scenario()?.experiment || "", opportunity: "", success: scenario()?.signal || "", support: scenario()?.support || "", date: "" });
  addEvent("Growth action added");
  saveState();
  render();
}

function download(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 500);
}

function reset() {
  if (!confirm("Start a fresh test journey? This clears the entries saved in this browser.")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = blankState();
  activeReflection = "";
  saveState("Fresh journey");
  render();
  toast("A fresh test journey is ready.");
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button, a");
  if (!target) return;
  if (target.dataset.step !== undefined) { event.preventDefault(); navigate(target.dataset.step); return; }
  if (target.dataset.persona) { setPersona(target.dataset.persona); return; }
  if (target.dataset.scenario) {
    state.scenario = target.dataset.scenario;
    const chosen = scenario();
    if (!state.context) state.context = chosen.story;
    saveState(); render(); return;
  }
  if (target.dataset.attribute) { selectAttribute(target.dataset.attribute); return; }
  if (target.dataset.removeAttribute) { selectAttribute(target.dataset.removeAttribute); return; }
  if (target.dataset.discussion) {
    const id = target.dataset.discussion;
    if (state.discussion.includes(id)) state.discussion = state.discussion.filter((item) => item !== id);
    else if (state.discussion.length < 2) state.discussion.push(id);
    else toast("Choose no more than two attributes for this conversation.");
    saveState(); render(); return;
  }
  if (target.dataset.reflection) { activeReflection = target.dataset.reflection; render(); return; }
  if (target.dataset.removeAction) {
    state.actions = state.actions.filter((item) => item.id !== target.dataset.removeAction);
    saveState(); render(); return;
  }
  if (target.dataset.suggestionResponse) {
    state.supervisorSuggestion.status = target.dataset.suggestionResponse;
    if (target.dataset.suggestionResponse === "Add to our discussion" && !state.selected.includes(state.supervisorSuggestion.attribute) && state.selected.length < 5) state.selected.push(state.supervisorSuggestion.attribute);
    addEvent("Officer responded to supervisor suggestion", target.dataset.suggestionResponse);
    saveState(); render(); return;
  }

  const action = target.dataset.action;
  if (!action) return;
  event.preventDefault();
  if (action === "home") { state.started = false; saveState(); render(); }
  if (action === "start") { state.level = Number($("#welcome-level").value); state.started = true; state.step = "situation"; addEvent("Journey started", levelName()); saveState(); render(); }
  if (action === "reset") reset();
  if (action === "open-feedback") $("#feedback-dialog").showModal();
  if (action === "clear-scenario") { state.scenario = ""; saveState(); render(); }
  if (action === "use-scenario-focus") {
    const ids = scenario().links.map(([id]) => id);
    state.selected = [...new Set([...state.selected, ...ids])].slice(0, 5);
    state.discussion = ids.slice(0, 2);
    ids.forEach(ensureReflection);
    addEvent("Guided scenario applied", scenario().title);
    saveState(); navigate("focus");
  }
  if (action === "save-suggestion") {
    const attribute = $("#suggestion-attribute").value;
    const reason = $("#suggestion-reason").value.trim();
    if (!attribute || !reason) return toast("Choose an attribute and add a concrete rationale.");
    state.supervisorSuggestion = { attribute, reason, date: new Date().toISOString(), status: "Proposed" };
    addEvent("Supervisor suggested a focus", attr(attribute).name);
    saveState(); render(); toast("Suggestion added to the shared conversation.");
  }
  if (action === "add-action") addAction();
  if (action === "toggle-agreement") {
    state.agreed = !state.agreed;
    state.agreedAt = state.agreed ? new Date().toISOString() : "";
    addEvent(state.agreed ? "Plan agreed" : "Plan reopened");
    saveState(); render();
  }
  if (action === "update-focus-status") {
    const id = $("#focus-update-attribute").value;
    const status = $("#focus-update-status").value;
    const reason = $("#focus-update-reason").value.trim();
    if (!id) return toast("Choose a focus area to update.");
    state.focusStatus[id] = { status, reason, date: new Date().toISOString() };
    addEvent(`${attr(id).name} marked ${status}`, reason);
    saveState(); render();
  }
  if (action === "add-practice-note") {
    const text = $("#practice-note").value.trim();
    if (!text) return toast("Add a brief practice note first.");
    state.practiceNotes.unshift({ text, date: new Date().toISOString() });
    addEvent("Practice note added");
    saveState(); render();
  }
  if (action === "export-journey") download(`IDEAL-test-journey-${today()}.json`, state);
  if (action === "export-feedback") {
    const rating = $('input[name="rating"]:checked', $("#feedback-dialog"))?.value || "";
    const payload = { date: new Date().toISOString(), persona: $("#feedback-persona").value, intuitiveRating: rating, helpful: $("#feedback-helpful").value, friction: $("#feedback-friction").value, suggestedChange: $("#feedback-change").value, journeyLevel: levelName(), journeyStep: state.step };
    download(`IDEAL-prototype-feedback-${today()}.json`, payload);
    setTimeout(() => $("#feedback-dialog").close(), 50);
    toast("Feedback downloaded. Please send the file to the prototype owner.");
  }
});

$("#level-select").addEventListener("change", (event) => {
  state.level = Number(event.target.value);
  state.scenario = "";
  state.reflections = {};
  state.selected.forEach(ensureReflection);
  addEvent("Leadership level changed", levelName());
  saveState();
  render();
});

async function init() {
  try {
    [framework, scenarios] = await Promise.all([
      fetch("data/framework.json").then((response) => response.json()),
      fetch("data/scenarios.json").then((response) => response.json()),
    ]);
    $("#level-select").innerHTML = framework.levels.map((level, index) => `<option value="${index}">${esc(level)}</option>`).join("");
    $("#loading").hidden = true;
    $("#workspace").hidden = false;
    render();
  } catch (error) {
    $("#loading").innerHTML = `<h2>Prototype could not load</h2><p>Please refresh the page or check that all files were uploaded together.</p>`;
    console.error(error);
  }
}

init();
