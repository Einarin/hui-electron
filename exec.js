const { spawn } = require('electron').remote.require('child_process');
const fs = require('electron').remote.require('fs');

function make_output(type = 'div'){
    const target = document.createElement(type);
    const ctrls = document.createElement('div');
    ctrls.style.float = 'right';
    ctrls.style.zIndex = '1';
    const min = document.createElement('img');
    min.src = 'sub-24px.svg';
    min.style.background = 'none';
    var expand;
    const collapse = () => {
        min.src = 'add-24px.svg';
        target.oldHeight = target.style.height;
        target.style.height = '44px';
        min.onclick = expand;
    };
    expand = () => {
        min.src = 'sub-24px.svg';
        target.style.height = target.oldHeight;
        min.onclick = collapse;
    }
    min.onclick = collapse;
    ctrls.appendChild(min);
    const del = document.createElement('img');
    del.src = 'clear-24px.svg';
    del.style.background = 'none';
    ctrls.appendChild(del);
    del.onclick = () => target.parentElement.removeChild(target);
    target.appendChild(ctrls);
    target.className = "output";
    const history = document.getElementById("history1");
    history.insertBefore(target,history.firstElementChild);
    return target;
}

function exec_shell(command,args){
    const exec = spawn(command,args, { cwd: process.cwd(), shell: true });
    const target = make_output();
    const title = document.createElement("h2");
    title.innerText = command + " " + args.join(" ");
    target.appendChild(title);
    exec.stdout.on('data', (data) => {
        //document.write();
        //target.innerText += data.toString().replace('\r\n','<br/>');
        const lines = data.toString().split('\n');
        for(line of lines) {
            const text = document.createTextNode(line);
            const p = document.createElement("p");
            p.style.margin = "0em";
            p.appendChild(text);
            //p.innerText = line;
            target.appendChild(p);
        }
    });
    exec.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        for(line of lines) {
            //const text = document.createTextNode(line);
            const p = document.createElement("p");
            //p.appendChild(text);
            p.innerText = line;
            target.appendChild(p);
        }
    });
    exec.on('exit', (code) => {
        const p = document.createElement("p");
        if(code == 0) {
            p.innerText = '✔';
        } else {
            p.innerText = `❌ ${code}`;
        }
        
        target.appendChild(p);
    });
}

function scroll_to_current() {
    const history = document.getElementById('history1');
    history.scrollTop = history.scrollHeight;
}

function on_input(input){
    scroll_to_current();
    exec_parse(input.value);
    input.value = '';
}

function exec_parse(command){
    const parsed = command.split(' ');
    if(parsed[0] == "open") {
        const iframe = document.createElement('iframe');
        //<iframe src="..." frameborder="0" sandbox="allow-top-navigation"></iframe>
        //iframe.sandbox = "true";
        iframe.frameBorder = 0;
        iframe.src = parsed.slice(1).join(' ');
        const history = document.getElementById("history1");
        history.insertBefore(iframe,history.firstElementChild);
    } else if(parsed[0] == "cd") {
        const target = make_output();
        const old_dir = process.cwd();
        const title = document.createElement("h2");
        try {
            process.chdir(parsed.slice(1).join(' '));
            title.innerText = old_dir + ' -> ' + process.cwd() + ' ✔';
        } catch(err){
            title.innerText = `❌ couldn't cd to ${parsed.slice(1).join(' ')} ❌`;
        }
        target.appendChild(title);
    } else if(parsed[0] == "ls") {
        list_directory(process.cwd());
    } else if(parsed[0] == 'exec') {
        exec_shell(parsed[1],parsed.slice(2));
    } else {
        exec_shell(parsed[0],parsed.slice(1));
    }
}

function get_type(name) {
    var type = 'unknown';
    ['png','bmp','gif','svg','jpg','jpeg'].forEach( ext => {
        if(name.endsWith(ext)) {
            type = 'image';
    }});
    ['txt','js','css','cpp','c','h','hpp','rs','toml','json'].forEach( ext => {
        if(name.endsWith(ext)) {
            type = 'text';
    }});
    return type;
}

async function list_directory(path) {
    const target = make_output();
    const title = document.createElement("h2");
    title.innerText = "ls " + path;
    target.appendChild(title);
    const dir = await fs.promises.readdir(path, { withFileTypes: true });
    console.log(dir);
    dir.forEach(dirent => {
        const div = document.createElement('div');
        div.style.display = 'inline-block';
        div.style.width = '10em';
        div.style.height = '10em';
        if(dirent.isDirectory()){
            const img = document.createElement('img');
            img.style.maxWidth = '100%';
            img.style.width = '100%';
            img.style.maxHeight = '100%';
            img.style.background = 'none';
            img.src = 'folder-24px.svg';
            div.appendChild(img);
            const p = document.createElement('p');
            p.style.width = '100%';
            p.style.textAlign = 'center';
            p.innerText = dirent.name;
            div.appendChild(p);
            div.onclick = () => {
                exec_parse('cd ' + path + '/' + dirent.name);
                list_directory(path + '/' + dirent.name);
                scroll_to_current();
            }
        } else if(dirent.isFile()){
            const img = document.createElement('img');
            img.style.maxWidth = '100%';
            img.style.width = '100%';
            img.style.maxHeight = '100%';
            img.style.background = 'none';
            img.src = 'file-24px.svg';
            const type = get_type(dirent.name);
            if(type == "image") {
                    img.src = 'file://' + path + '/' + dirent.name;
                    div.onclick = ev => {
                        scroll_to_current();
                        const output = make_output();
                        const image = document.createElement('img');
                        image.style.maxWidth = '100%';
                        image.style.width = '100%';
                        image.style.maxHeight = '100%';
                        image.style.background = 'none';
                        image.src = img.src;
                        output.appendChild(image);
                };
            } else if(type == "text") {
                div.onclick = async () => {
                    scroll_to_current();
                    const output = make_output();
                    const textarea = document.createElement('textarea');
                    textarea.cols = '80';
                    textarea.style.width = '100%';
                    textarea.style.maxHeight = '90vh';
                    output.appendChild(textarea);
                    const save = document.createElement('button');
                    save.innerText = 'Save';
                    save.onclick = () => alert('Not Implemented!');
                    output.appendChild(save);
                    textarea.value = await fs.promises.readFile(path + '/' + dirent.name, 'utf8');
                    textarea.style.height = textarea.scrollHeight +'px';
                };
            } else {
                div.onclick = () => exec_shell('start',[path + '/' + dirent.name])
            }
            div.appendChild(img);
            const p = document.createElement('p');
            p.style.width = '100%';
            p.style.textAlign = 'center';
            p.innerText = dirent.name;
            div.appendChild(p);
        }
        target.appendChild(div);
    });
}