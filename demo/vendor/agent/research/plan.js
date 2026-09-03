const PLAYBOOKS = {
    fintech: {
        metrics: ["take rate", "MAU / transaction volume growth", "CAC vs LTV", "NPL / credit losses"],
        triggers: ["central-bank rate decisions", "license grants or revocations", "interchange / fee regulation"],
    },
    energy: {
        metrics: ["capacity additions (GW)", "PPA / tariff pricing", "capacity factor", "project pipeline"],
        triggers: ["auction results", "subsidy or tariff policy changes", "grid interconnection milestones"],
    },
    healthcare: {
        metrics: ["patient volumes", "reimbursement rates", "bed occupancy / capacity", "R&D pipeline stages"],
        triggers: ["drug approvals", "pricing regulation", "public health budgets"],
    },
    biotech: {
        metrics: ["trial phase progression", "cash runway", "addressable patient population"],
        triggers: ["readouts and FDA/EMA decisions", "partnership deals", "patent cliffs"],
    },
    "ai-tech": {
        metrics: ["ARR growth", "gross margin", "compute spend", "model benchmark positioning"],
        triggers: ["flagship model releases", "export controls", "hyperscaler capex guidance"],
    },
    "real-estate": {
        metrics: ["occupancy rates", "rent growth", "cap rates", "new supply pipeline"],
        triggers: ["rate decisions", "zoning / policy shifts", "REIT earnings"],
    },
    consumer: {
        metrics: ["same-store sales", "volume vs price growth", "inventory turns", "margin trajectory"],
        triggers: ["festive / seasonal demand", "input-cost swings", "consumer confidence prints"],
    },
    industrials: {
        metrics: ["order books", "capacity utilization", "backlog coverage", "capex cycles"],
        triggers: ["infrastructure budgets", "trade policy", "PMI prints"],
    },
    "crypto-rwa": {
        metrics: ["TVL / AUM tokenized", "protocol revenue", "issuer pipeline", "redemption liquidity"],
        triggers: ["tokenization regulation", "major issuer launches", "oracle / custody incidents"],
    },
    defense: {
        metrics: ["order backlog", "budget allocations", "delivery schedules", "margins on programs"],
        triggers: ["defense budget cycles", "procurement awards", "geopolitical escalations"],
    },
};
const GENERALIST_PLAYBOOK = {
    metrics: ["GDP growth", "inflation / CPI", "policy rate", "currency", "equity index breadth"],
    triggers: ["central-bank meetings", "elections / budget announcements", "rating-agency actions"],
};
export function buildAgenda(spec) {
    const playbook = (spec.sectorId && PLAYBOOKS[spec.sectorId]) || GENERALIST_PLAYBOOK;
    const beat = spec.sector ? `${spec.sector} in ${spec.geography}` : `${spec.geography} markets`;
    const focusList = spec.focus.length ? spec.focus.join(", ") : `the whole ${beat} space`;
    const horizon = spec.horizon ?? "your horizon";
    return {
        questions: [
            `Who are the top 5 players in ${focusList}, and what is each one's actual moat?`,
            `What does the regulatory landscape in ${spec.geography} allow, block, or about to change for ${beat}?`,
            `Where is the money flowing — funding rounds, capacity additions, or order books — in ${focusList}?`,
            `What is the bear case nobody in ${beat} wants to talk about?`,
            `Over a ${horizon} horizon, what single datapoint would prove the thesis right or wrong?`,
        ],
        metrics: playbook.metrics,
        triggers: playbook.triggers,
    };
}
