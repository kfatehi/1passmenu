const spawn = require('child_process').spawn;

export default class Dmenu<T> {
  private proc;
  private itemByLabel : {[label:string]:T} = {};
  private itemCount = 0;

  constructor() {
    this.proc = spawn('/usr/bin/dmenu', ['-i']);
    this.proc.stdin.setEncoding('utf-8');
    this.proc.stdout.setEncoding('utf-8');
    this.proc.stderr.setEncoding('utf-8');
    this.proc.stderr.on('data', (data)=>{
      console.log(data);
    });
  }

  add(_label:string, data:T) {
    let label = this.addItem(_label, data);
    this.proc.stdin.write(label.trim()+"\n")
    this.itemCount++;
  }

  done() {
    this.proc.stdin.end()
    if (this.itemCount === 0) {
      this.proc.kill();
    }
  }

  setCallback(callback:(sel:string, data:T)=>any) {
    this.proc.stdout.on('data', (_sel)=>{
      let sel = _sel.trim();
      callback(sel, this.itemByLabel[sel])
    })
  }

  private addItem(label, data:T) : string {
    label = label.trim();
    let existing = this.itemByLabel[label];
    if (existing) {
      let num = parseInt(label[label.length-1])
      if (num >= 1) {
        label = label.slice(0, label.length-1)+(num+1);
      } else {
        label = label+1;
      }
      return this.addItem(label, data);
    } else {
      this.itemByLabel[label] = data;
    }
    return label;
  }
}
