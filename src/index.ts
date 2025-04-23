type TreeNode = {
    parent: TreeNode | null;
    type: "[" | "{" | "(" | "\"" | "'" | "<" | "atom" | "root",
    children: TreeNode[] | string;
    newline?: boolean;
};
type State = {
    root: TreeNode,
    cursor: {
        at: TreeNode,
        anchor: number,
        cursor: number,
    },
};
// so this has our cursor between elements but we were going to try having it select whole elements like vim
// then if you want to insert you can insert after or before

const newline = Symbol('newline');
type SampleChild = Sample[] | string;
type Sample = {kind: TreeNode["type"], children: SampleChild, newline?: boolean};
function node(kind: TreeNode["type"], children: SampleChild, newline?: boolean): Sample {
    return {kind, children, newline};
}
const sample = node("root", [
    node("[", [node("atom", "print"), node("[", [node('"', "hello world")])], false),
    node("[", [
        node("atom", "if"),
        node("[", [
            node("atom", "condition"),
            node("atom", "=="),
            node("atom", "false"),
        ]),
        node("{", [
            node("[", [
                node("atom", "print"),
                node("[", [node('"', "condition was true")])
            ]),
        ], true),
        node("atom", "else"),
        node("{", [
            node("[", [
                node("atom", "print"),
                node("[", [node('"', "condition was false")])
            ]),
        ], true),
    ]),
], true);
function convertToNode(parent: TreeNode | null, sample: Sample): TreeNode {
    const node: TreeNode = {
        parent,
        children: [],
        type: sample.kind,
        newline: sample.newline,
    };
    if(typeof sample.children === 'string') {
        node.children = sample.children;
    }else for (const item of sample.children) {
        (node.children as TreeNode[]).push(convertToNode(node, item));
    }
    return node;
}

const node_type_keybinds: Record<string, TreeNode["type"]> = {
    "[": "[",
    "{": "{",
    "(": "(",
    "\"": "\"",
    "'": "'",
    "<": "<",
};
const node_exit_type_keybinds: Record<string, TreeNode["type"]> = {
    "]": "[",
    "}": "{",
    ")": "(",
    "\"": "\"",
    "'": "'",
    ">": "<",
    " ": "atom",
};
function getStartEnd(type: TreeNode["type"], needs_quote: boolean): [string, string] {
    switch(type) {
        case "[": return ["[", "]"];
        case "{": return ["{", "}"];
        case "(": return ["(", ")"];
        case "\"": return ["\"", "\""];
        case "'": return ["'", "'"];
        case "<": return ["<", ">"];
        case "atom": return needs_quote ? ["@\"", "\""] : ["", ""];
        case "root": return ["", ""];
    }
}

function renderNode(state: State, node: TreeNode): Node {
    let sel = state.cursor.at === node;
    let sel_min = Math.min(state.cursor.cursor, state.cursor.anchor);
    let sel_max = Math.max(state.cursor.cursor, state.cursor.anchor);

    // if (typeof node.children === 'string') {
    //     let nodestr = node.children;
    //     const fragment = document.createElement("span");
    //     if(node.newline || node.children.includes(" ")) fragment.appendChild(document.createTextNode('"'));
    //     if(sel) {
    //         fragment.appendChild(document.createTextNode(nodestr.slice(0, sel_min)));
    //         const selected_span = document.createElement("span");
    //         selected_span.classList.add("selected");
    //         selected_span.appendChild(document.createTextNode(nodestr.slice(sel_min, sel_max)));
    //         fragment.appendChild(selected_span);
    //         fragment.appendChild(document.createTextNode(nodestr.slice(sel_max)));
    //     }else{
    //         fragment.appendChild(document.createTextNode(nodestr));
    //     }
    //     if(node.newline || node.children.includes(" ")) fragment.appendChild(document.createTextNode('"'));
    //     return fragment;
    // }

    let str_sel_min: number | undefined;
    let str_sel_max: number | undefined;
    let left_stringified: string | undefined;
    let mid_stringified: string | undefined;
    let right_stringified: string | undefined;
    let needs_newline: boolean;
    let needs_quote: boolean;
    if(typeof node.children === "string") {
        str_sel_min = sel ? sel_min : 0;
        str_sel_max = sel ? sel_max : node.children.length;
        let left = node.children.slice(0, str_sel_min);
        let mid = node.children.slice(str_sel_min, str_sel_max);
        let right = node.children.slice(str_sel_max);
        left_stringified = JSON.stringify(left);
        left_stringified = left_stringified.substring(1, left_stringified.length - 1);
        mid_stringified = JSON.stringify(mid);
        mid_stringified = mid_stringified.substring(1, mid_stringified.length - 1);
        right_stringified = JSON.stringify(right);
        right_stringified = right_stringified.substring(1, right_stringified.length - 1);
        needs_newline = node.children.includes("\n");
        if(node.type === "atom") {
            needs_quote = node.children.match(/[^a-zA-Z0-9_-]/);
        }else{
            needs_quote = left !== left_stringified || mid !== mid_stringified || right !== right_stringified;
        }
    }else{
        needs_newline = node.newline ?? false;
        needs_quote = false;
    }

    const ch = document.createElement(typeof node.children === "string" ? "s-leaf" : "s-node");
    ch.setAttribute("style", "display: inline;");
    const [node_start, node_end] = getStartEnd(node.type, needs_quote ?? false);
    ch.appendChild(document.createTextNode( node_start ));
    let i = 0;
    const addcursor = (tgt: HTMLElement, mode: "horizontal" | "vertical") => {
        if(sel && i === sel_min && sel_min === sel_max) {
            if(mode === "vertical") {
                const el = document.createElement("span");
                el.setAttribute("style", "position: relative");
                const line = document.createElement("div");
                line.setAttribute("style", "position: absolute; background-color: blue; height: 100%; width: 2px; left: 50%;");
                el.appendChild(line);
                tgt.appendChild(el);
            }else if(mode === "horizontal") {
                const el = document.createElement("div");
                el.setAttribute("style", "position: relative;");
                const line = document.createElement("div");
                line.setAttribute("style", "position: absolute; background-color: blue; height: 2px; width: 100%; top: 50%;");
                el.appendChild(line);
                tgt.appendChild(el);
            }
        }
    }
    if(needs_newline) {
        const subch = document.createElement("div");
        subch.setAttribute("style", "display: flex; flex-direction: column; " + (node.type !== "root" ? "padding-left: 10px;" : ""));
        if(typeof node.children === "string") {
            const chcontainer = document.createElement("span");

            addcursor(chcontainer, "vertical");
            chcontainer.appendChild(document.createTextNode(left_stringified!));
            i += str_sel_min!;
            addcursor(chcontainer, "vertical");
            chcontainer.appendChild(document.createTextNode(mid_stringified!));
            i += str_sel_max! - str_sel_min!;
            addcursor(chcontainer, "vertical");
            chcontainer.appendChild(document.createTextNode(right_stringified!));
            i += node.children.length - str_sel_max!;
            addcursor(chcontainer, "vertical");

            subch.appendChild(chcontainer);
        }else{
            if(i === 0) addcursor(subch, "horizontal");
            for (const child of node.children) {
                const selected = sel && i >= sel_min && i < sel_max;
                const chcontainer = document.createElement("div");
                chcontainer.appendChild(renderNode(state, child));
                if(selected) {
                    chcontainer.classList.add("selected");
                }
                subch.appendChild(chcontainer);
                i += 1;
                addcursor(subch, "horizontal");
            }
        }
        ch.appendChild(subch);
    }else{
        if(typeof node.children === "string") {
            const chcontainer = document.createElement("span");

            addcursor(chcontainer, "vertical");
            chcontainer.appendChild(document.createTextNode(left_stringified!));
            i += str_sel_min!;
            addcursor(chcontainer, "vertical");
            if(sel && i >= sel_min && i + (str_sel_max! - str_sel_min!) <= sel_max) {
                const selected_span = document.createElement("span");
                selected_span.classList.add("selected");
                selected_span.appendChild(document.createTextNode(mid_stringified!));
                chcontainer.appendChild(selected_span);
            }else{
                chcontainer.appendChild(document.createTextNode(mid_stringified!));
            }
            i += str_sel_max! - str_sel_min!;
            addcursor(chcontainer, "vertical");
            chcontainer.appendChild(document.createTextNode(right_stringified!));
            i += node.children.length - str_sel_max!;
            addcursor(chcontainer, "vertical");

            ch.appendChild(chcontainer);
        }else {
            addcursor(ch, "vertical");
            for (const child of node.children) {
                if(i !== 0) ch.appendChild(document.createTextNode(" "));
                const chcontainer = document.createElement("span");
                chcontainer.appendChild(renderNode(state, child));
                if(sel && i >= sel_min && i < sel_max) {
                    chcontainer.classList.add("selected");
                }
                ch.appendChild(chcontainer);
                i++;
                addcursor(ch, "vertical");
            }
        }
    }
    ch.appendChild(document.createTextNode( node_end ));
    return ch;
}

const rootNode = convertToNode(null, sample);
const state: State = {
    root: rootNode,
    cursor: {
        at: rootNode,
        anchor: 0,
        cursor: 0,
    },
};

const root = document.getElementById('root') as HTMLDivElement;
root.setAttribute("style", "white-space: pre-wrap;");

function render() {
    root.innerHTML = '';
    root.setAttribute("style", "white-space: pre-wrap;");
    root.appendChild(renderNode(state, state.root));
}

document.addEventListener('keydown', (event) => {
    console.log("start", state.cursor, event.key);
    using _ = {[Symbol.dispose]: () => {
        console.log("end", state.cursor);
        render();
    }};
    if(event.key === 'ArrowRight') {
        const prev_min = Math.min(state.cursor.cursor, state.cursor.anchor);
        const prev_max = Math.max(state.cursor.cursor, state.cursor.anchor);
        if(prev_min === prev_max) {
            const addone = Math.min(prev_max + 1, state.cursor.at.children.length);
            state.cursor.cursor = addone;
            state.cursor.anchor = addone;
        }else{
            state.cursor.cursor = prev_max;
            state.cursor.anchor = prev_max;
        }
        return;
    }
    if(event.key === 'ArrowLeft') {
        const prev_min = Math.min(state.cursor.cursor, state.cursor.anchor);
        const prev_max = Math.max(state.cursor.cursor, state.cursor.anchor);
        if(prev_min === prev_max) {
            const addone = Math.max(prev_min - 1, 0);
            state.cursor.cursor = addone;
            state.cursor.anchor = addone;
        }else{
            state.cursor.cursor = prev_min;
            state.cursor.anchor = prev_min;
        }
        return;
    }
    if(event.key === 'ArrowUp') {
        const current_ch_num = state.cursor.at.parent?.children.indexOf(state.cursor.at);
        if(current_ch_num != null) {
            state.cursor.at = state.cursor.at.parent!;
            state.cursor.cursor = current_ch_num;
            state.cursor.anchor = current_ch_num;
        }
        return;
    }
    if(event.key === 'ArrowDown') {
        const newtarget = state.cursor.at.children[Math.min(state.cursor.cursor, state.cursor.anchor)]!;
        console.log(state.cursor, newtarget);
        if(typeof newtarget === 'object') {
            state.cursor.at = newtarget;
            state.cursor.cursor = 0;
            state.cursor.anchor = 0;
        }
        return;
    }
    if(event.key === 'Enter' && typeof state.cursor.at.children !== "string") {
        const selmin = Math.min(state.cursor.cursor, state.cursor.anchor);
        const selmax = Math.max(state.cursor.cursor, state.cursor.anchor);
        if(selmin === selmax) {
            // although inside a string, maybe you expect enter to create a new line in the string
            // not to toggle its newline-ness
            // which is a pretty fair expectation
            state.cursor.at.newline = !state.cursor.at.newline;
        }else if(Array.isArray(state.cursor.at.children)) {
            const targets = state.cursor.at.children.slice(selmin, selmax)!;
            for(const target of targets) {
                target.newline = !target.newline;
            }
        }
        return;
    }
    if(event.key === "Backspace") {
        // unwrap the selected node(s)
        const chmin = Math.min(state.cursor.cursor, state.cursor.anchor);
        const chmax = Math.max(state.cursor.cursor, state.cursor.anchor);
        if(Array.isArray(state.cursor.at.children)) {
            const targets = state.cursor.at.children.slice(chmin, chmax);
            const nres: TreeNode[] = [];
            for (const target of targets) {
                if(typeof target.children === "string") {
                    nres.push(target);
                    continue; // don't splat strings
                }
                for(const child of target.children) {
                    nres.push(child);
                }
            }
            state.cursor.at.children.splice(chmin, chmax - chmin, ...nres);
            state.cursor.anchor = chmin;
            state.cursor.cursor = chmin + nres.length;
        }
        return;
    }
    // handle '{'
    if(node_type_keybinds[event.key]) {
        const chidx = Math.min(state.cursor.cursor, state.cursor.anchor);
        const maxidx = Math.max(state.cursor.cursor, state.cursor.anchor);
        const newtarget = state.cursor.at.children.slice(chidx, maxidx)!;
        if(Array.isArray(state.cursor.at.children)) {
            const kind = node_type_keybinds[event.key]!;
            const wrapped: TreeNode = {
                parent: state.cursor.at,
                children: newtarget.length === 0 && kind === "\"" ? "" : newtarget,
                type: kind,
                newline: false,
            };
            newtarget.parent = wrapped;
            state.cursor.at.children.splice(chidx, maxidx - chidx, wrapped);
            state.cursor.anchor = chidx;
            state.cursor.cursor = chidx + 1;
            if(chidx === maxidx) {
                // insert; go inside
                state.cursor.at = wrapped;
                state.cursor.anchor = 0;
                state.cursor.cursor = 0;
            }
        }
        return;
    }
    if(node_exit_type_keybinds[event.key]) {
        const exit_type = node_exit_type_keybinds[event.key]!;
        if(state.cursor.at.type === exit_type) {
            const current_ch_num = state.cursor.at.parent?.children.indexOf(state.cursor.at);
            if(current_ch_num != null) {
                state.cursor.at = state.cursor.at.parent!;
                state.cursor.cursor = current_ch_num + 1;
                state.cursor.anchor = current_ch_num + 1;
            }
            return;
        }
    }
    if(event.key.length === 1 || event.key === "Enter") {
        let char = event.key;
        if(char === "Enter") char = "\n";
        const chidx = Math.min(state.cursor.cursor, state.cursor.anchor);
        const maxidx = Math.max(state.cursor.cursor, state.cursor.anchor);
        if(Array.isArray(state.cursor.at.children)) {
            const wrapped: TreeNode = {
                parent: state.cursor.at,
                children: char,
                type: "atom",
                newline: false,
            };
            state.cursor.at.children.splice(chidx, maxidx - chidx, wrapped);
            state.cursor.at = wrapped;
            state.cursor.anchor = char.length;
            state.cursor.cursor = char.length;
        }else{
            const left = state.cursor.at.children.slice(0, chidx);
            const mid = char;
            const right = state.cursor.at.children.slice(chidx);
            state.cursor.at.children = `${left}${mid}${right}`;
            state.cursor.anchor += char.length;
            state.cursor.cursor += char.length;
        }
        return;
    }
});
render();
