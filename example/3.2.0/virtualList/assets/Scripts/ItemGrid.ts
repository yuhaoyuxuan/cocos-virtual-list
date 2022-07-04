import { _decorator, Component, Node, find, Label } from 'cc';
import AItemRenderer from './core/AItemRenerer';
const { ccclass, property } = _decorator;

@ccclass('ItemGrid')
export class ItemGrid extends AItemRenderer<string> {
    
    protected dataChanged(): void {
        find("lblName",this.node).getComponent(Label).string = this.data;
    }
   
}
