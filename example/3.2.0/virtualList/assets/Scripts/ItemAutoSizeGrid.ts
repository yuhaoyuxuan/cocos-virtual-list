import { _decorator, Color, Component, find, Label, Node, Sprite } from 'cc';
import { AItemRenderer } from './core/AItemRenderer';
const { ccclass, property } = _decorator;

const color = new Color(255, 207, 155, 255);

@ccclass('ItemAutoSizeGrid')
export class ItemAutoSizeGrid extends AItemRenderer<string> {
    protected dataChanged(): void {
        find("lblName", this.node).getComponent(Label).string = this.data;
        let h = Math.floor(80 + Math.random() * 100);
        let w = Math.floor(80 + Math.random() * 100);
        this["h_" + this.data] = this["h_" + this.data] ?? h;
        this["w_" + this.data] = this["w_" + this.data] ?? w;
        if (!this["c_" + this.data]) {
            color.r = 255 * Math.random();
            color.g = 255 * Math.random();
            color.b = 255 * Math.random();
            this["c_" + this.data] = color.clone();
        }
        this.node.getComponent(Sprite).color = this["c_" + this.data];
        this.node._uiProps.uiTransformComp.setContentSize(this["w_" + this.data], this["h_" + this.data]);
    }

}


