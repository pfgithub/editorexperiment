type TreeNode = {
    parent: TreeNode | null;
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
type Sample = string | Sample[] | typeof newline;
const sample: Sample = [newline,
    ["print", ["hello world"]],
    ["if", ["condition", "==", "false"], [
        newline, ["print", ["condition was true"]],
    ], "else", [
        newline, ["print", ["condition was false"]],
    ]]
];
function convertToNode(parent: TreeNode | null, sample: Sample): TreeNode {
    if (typeof sample === 'string') {
        return {
            parent,
            children: sample,
        };
    }
    if(sample === newline) throw new Error("error");
    const node: TreeNode = {
        parent,
        children: [],
    };
    for (const item of sample) {
        if(item === newline) {
            node.newline = true;
            continue;
        }
        (node.children as TreeNode[]).push(convertToNode(node, item));
    }
    return node;
}

function renderNode(state: State, node: TreeNode): Node {
    let sel = state.cursor.at === node;
    let sel_min = Math.min(state.cursor.cursor, state.cursor.anchor);
    let sel_max = Math.max(state.cursor.cursor, state.cursor.anchor);

    if (typeof node.children === 'string') {
        let nodestr = node.children;
        if(sel) {
            const fragment = document.createDocumentFragment();
            fragment.appendChild(document.createTextNode(nodestr.slice(0, sel_min)));
            const selected_span = document.createElement("span");
            selected_span.setAttribute("style", "background-color: blue;");
            selected_span.appendChild(document.createTextNode(nodestr.slice(sel_min, sel_max)));
            fragment.appendChild(selected_span);
            fragment.appendChild(document.createTextNode(nodestr.slice(sel_max)));
            return fragment;
        }
        return document.createTextNode(nodestr);
    }

    const ch = document.createElement("div");
    ch.setAttribute("style", "display: inline;");
    ch.appendChild(document.createTextNode("["));
    if(node.newline) {
        const subch = document.createElement("div");
        subch.setAttribute("style", "display: flex; flex-direction: column; margin-left: 10px;");
        let i = 0;
        const addcursor = () => {
            if(i === sel_min || i === sel_max) {
                const el = document.createElement("div");
                el.setAttribute("style", "position: relative;");
                const line = document.createElement("div");
                line.setAttribute("style", "position: absolute; background-color: blue; height: 2px; width: 100%; top: 50%;");
                el.appendChild(line);
                subch.appendChild(el);
            }
        }
        for (const child of node.children) {
            if(sel && i === 0) addcursor();
            const selected = sel && i >= sel_min && i < sel_max;
            const chcontainer = document.createElement("div");
            chcontainer.appendChild(renderNode(state, child));
            if(selected) {
                chcontainer.setAttribute("style", "background-color: blue;");
            }
            subch.appendChild(chcontainer);
            i += 1;
            if(sel) addcursor();
        }
        ch.appendChild(subch);
    }else{
        let idx = 0;
        const addcursor = () => {
            if(idx >= sel_min && idx <= sel_max) {
                const el = document.createElement("div");
                el.setAttribute("style", "position: relative;display:inline");
                const line = document.createElement("div");
                line.setAttribute("style", "position: absolute; background-color: blue; height: 100%; width: 2px; left: 50%;");
                el.appendChild(line);
                ch.appendChild(el);
            }
        }
        for (const child of node.children) {
            if(sel && idx === 0) addcursor();
            if(idx !== 0) ch.appendChild(document.createTextNode(" "));
            const chcontainer = document.createElement("span");
            chcontainer.appendChild(renderNode(state, child));
            if(sel && idx >= sel_min && idx < sel_max) {
                chcontainer.setAttribute("style", "background-color: blue;");
            }
            ch.appendChild(chcontainer);
            idx++;
            if(sel) addcursor();
        }
    }
    ch.appendChild(document.createTextNode("]"));
    return ch;
}

const rootNode = convertToNode(null, sample);
const state: State = {
    root: rootNode,
    cursor: {
        at: rootNode,
        anchor: 0,
        cursor: 1,
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
        state.cursor.cursor++;
        state.cursor.cursor = Math.min(state.cursor.cursor, state.cursor.at.children.length);
        state.cursor.anchor = state.cursor.cursor - 1;
    }
    if(event.key === 'ArrowLeft') {
        state.cursor.cursor--;
        state.cursor.cursor = Math.max(state.cursor.cursor, 1);
        state.cursor.anchor = state.cursor.cursor - 1;
    }
    if(event.key === 'ArrowUp') {
        const current_ch_num = state.cursor.at.parent?.children.indexOf(state.cursor.at);
        if(current_ch_num != null) {
            state.cursor.at = state.cursor.at.parent!;
            state.cursor.cursor = current_ch_num + 1;
            state.cursor.anchor = current_ch_num;
        }
    }
    if(event.key === 'ArrowDown') {
        const newtarget = state.cursor.at.children[Math.min(state.cursor.cursor, state.cursor.anchor)]!;
        console.log(state.cursor, newtarget);
        if(typeof newtarget === 'object') {
            state.cursor.at = newtarget;
            state.cursor.cursor = 1;
            state.cursor.anchor = 0;
        }
    }
    console.log("end", state.cursor)
    render();
});
render();
