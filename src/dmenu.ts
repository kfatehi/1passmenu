const spawn = require('child_process').spawn;

type DmenuItem<T> = {label: string, data: T};

export default class Dmenu<T> {
  private proc;
  private itemByLabel : {[label:string]:T} = {};
  private itemCount = 0;
  private firsts : DmenuItem<T>[] = [];
  private rests : DmenuItem<T>[] = [];

  constructor() {
    this.proc = spawn('/usr/bin/dmenu', ['-i']);
    this.proc.stdin.setEncoding('utf-8');
    this.proc.stdout.setEncoding('utf-8');
    this.proc.stderr.setEncoding('utf-8');
    this.proc.stderr.on('data', (data)=>{
      console.log(data);
    });
  }

  private _add(item:DmenuItem<T>) {
    let label = this.addItem(item.label, item.data);
    this.proc.stdin.write(label.trim()+"\n")
    this.itemCount++;
  }

  add(label:string, data:T) {
    this.rests.push({ label, data });
  }

  addFirst(label:string, data:T) {
    this.firsts.push({ label, data });
  }

  done() {
    this.firsts.forEach(item=>this._add(item));
    this.rests.forEach(item=>this._add(item));
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
