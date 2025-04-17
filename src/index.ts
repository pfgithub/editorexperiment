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
    ["print", ["hello", "world"]],
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
    if (typeof node.children === 'string') {
        return document.createTextNode(JSON.stringify(node.children));
    }

    let sel = state.cursor.at === node;
    let sel_min = Math.min(state.cursor.cursor, state.cursor.anchor);
    let sel_max = Math.max(state.cursor.cursor, state.cursor.anchor);

    const ch = document.createElement("div");
    ch.setAttribute("style", "display: inline;");
    ch.appendChild(document.createTextNode("["));
    if(node.newline) {
        const subch = document.createElement("div");
        subch.setAttribute("style", "display: flex; flex-direction: column; margin-left: 10px;");
        let i = 0;
        const addcursor = () => {
            if(i >= sel_min && i <= sel_max) {
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
            subch.appendChild(renderNode(state, child));
            i += 1;
            if(sel) addcursor();
        }
        ch.appendChild(subch);
    }else{
        let idx = 0;
        const addcursor = () => {
            if(idx >= sel_min && idx <= sel_max) {
                const el = document.createElement("div");
                el.setAttribute("style", "position: relative;");
                const line = document.createElement("div");
                line.setAttribute("style", "position: absolute; background-color: blue; height: 2px; width: 100%; top: 50%;");
                el.appendChild(line);
                ch.appendChild(el);
            }
        }
        for (const child of node.children) {
            if(sel && idx === 0) addcursor();
            if(idx !== 0) ch.appendChild(document.createTextNode(" "));
            ch.appendChild(renderNode(state, child));
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
    if(event.key === 'ArrowRight') {
        state.cursor.cursor++;
        state.cursor.cursor = Math.min(state.cursor.cursor, state.cursor.at.children.length);
        state.cursor.anchor = state.cursor.cursor;
    }
    if(event.key === 'ArrowLeft') {
        state.cursor.cursor--;
        state.cursor.cursor = Math.max(state.cursor.cursor, 0);
        state.cursor.anchor = state.cursor.cursor;
    }
    render();
});
render();