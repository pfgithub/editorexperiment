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
const sample = node("[", [
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
};
function getStartEnd(type: TreeNode["type"], newline: boolean): [string, string] {
    switch(type) {
        case "[": return ["[", "]"];
        case "{": return ["{", "}"];
        case "(": return ["(", ")"];
        case "\"": return ["\"", "\""];
        case "'": return ["'", "'"];
        case "<": return ["<", ">"];
        case "atom": return newline ? ["@\"", "\""] : ["", ""];
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

    const ch = document.createElement("span");
    const [node_start, node_end] = getStartEnd(node.type, node.newline);
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
    if(node.newline) {
        const subch = document.createElement("div");
        subch.setAttribute("style", "display: flex; flex-direction: column; padding-left: 10px;");
        if(typeof node.children === "string") {
            const chcontainer = document.createElement("span");
            let str_sel_min = sel ? sel_min : 0;
            let str_sel_max = sel ? sel_max : node.children.length;

            addcursor(chcontainer, "vertical");
            chcontainer.appendChild(document.createTextNode(node.children.slice(0, str_sel_min)));
            i += str_sel_min;
            addcursor(chcontainer, "vertical");
            chcontainer.appendChild(document.createTextNode(node.children.slice(str_sel_min, str_sel_max)));
            i += str_sel_max - str_sel_min;
            addcursor(chcontainer, "vertical");
            chcontainer.appendChild(document.createTextNode(node.children.slice(str_sel_max)));
            i += node.children.length - str_sel_max;
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
            let str_sel_min = sel ? sel_min : 0;
            let str_sel_max = sel ? sel_max : node.children.length;

            addcursor(chcontainer, "vertical");
            chcontainer.appendChild(document.createTextNode(node.children.slice(0, str_sel_min)));
            i += str_sel_min;
            addcursor(chcontainer, "vertical");
            if(sel && i >= sel_min && i + (str_sel_max - str_sel_min) <= sel_max) {
                const selected_span = document.createElement("span");
                selected_span.classList.add("selected");
                selected_span.appendChild(document.createTextNode(node.children.slice(str_sel_min, str_sel_max)));
                chcontainer.appendChild(selected_span);
            }else{
                chcontainer.appendChild(document.createTextNode(node.children.slice(str_sel_min, str_sel_max)));
            }
            i += str_sel_max - str_sel_min;
            addcursor(chcontainer, "vertical");
            chcontainer.appendChild(document.createTextNode(node.children.slice(str_sel_max)));
            i += node.children.length - str_sel_max;
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

function render() {
    root.innerHTML = '';
    root.setAttribute("style", "white-space: pre-wrap;");
    root.appendChild(renderNode(state, state.root));
}

document.addEventListener('keydown', (event) => {
    console.log("start", state.cursor)
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
    }
    if(event.key === 'ArrowUp') {
        const current_ch_num = state.cursor.at.parent?.children.indexOf(state.cursor.at);
        if(current_ch_num != null) {
            state.cursor.at = state.cursor.at.parent!;
            state.cursor.cursor = current_ch_num;
            state.cursor.anchor = current_ch_num;
        }
    }
    if(event.key === 'ArrowDown') {
        const newtarget = state.cursor.at.children[Math.min(state.cursor.cursor, state.cursor.anchor)]!;
        console.log(state.cursor, newtarget);
        if(typeof newtarget === 'object') {
            state.cursor.at = newtarget;
            state.cursor.cursor = 0;
            state.cursor.anchor = 0;
        }
    }
    if(event.key === 'Enter') {
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
                children: newtarget,
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
    }
    if(node_exit_type_keybinds[event.key]) {
        const current_ch_num = state.cursor.at.parent?.children.indexOf(state.cursor.at);
        if(current_ch_num != null) {
            state.cursor.at = state.cursor.at.parent!;
            state.cursor.cursor = current_ch_num + 1;
            state.cursor.anchor = current_ch_num + 1;
        }
    }
    console.log("end", state.cursor)
    render();
});
render();
