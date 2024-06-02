const { settings, characterStorage, patch, api } = mod.getContext(import.meta);

class Multitasking extends NamespacedObject {
    constructor(namespace, id, game, ctx) {
        super(namespace, id);
        this._media = 'assets/octopus.png';
        this.game = game;
        this.ctx = ctx;
        this.actions = new Set();
        this.isActive = true;
        
        this.nonCombatSkills = ['melvorD:Woodcutting', 'melvorD:Fishing', 'melvorD:Firemaking', 'melvorD:Cooking', 'melvorD:Mining', 'melvorD:Smithing', 'melvorD:Thieving', 'melvorD:Fletching', 'melvorD:Crafting', 'melvorD:Runecrafting', 'melvorD:Herblore', 'melvorD:Agility', 'melvorD:Summoning', 'melvorD:Astrology', 'melvorD:AltMagic', 'melvorAoD:Cartography', 'melvorAoD:Archaeology']
    }

    get name() {
        return "Multitasking";
    }

    get media() {
        return this.getMediaURL(this._media);
    }
    
    addAction(action) {
        if(this.ctx.settings.section('Behavior Type').get("multitask-style") == "0") {
            this.actions.add(action);
        }
        else if(this.ctx.settings.section('Behavior Type').get("multitask-style") == "1") {
            if(this.nonCombatSkills.includes(action.id)
            ) {
                this.replaceAction(action, 0);
            }
            else if(action.id === 'melvorD:Combat') {
                this.replaceAction(action, 1);
            }
            else {
                //Not Supported or Not Caught... Add to allow for now...
                console.log("<Multitasking> Unhandled Action ID: " + action.id);
                this.actions.add(action);
            }
        }
    }

    removeAction(action) {
        this.actions.delete(action);
    }

    replaceAction(action, setting) {
        if(setting == 0) {
            this.actions.forEach(action => {
                if(this.nonCombatSkills.includes(action.id)) {
                    this.removeAction(action);
                }
            });

            this.actions.add(action);
        } else {
            this.actions.add(action);
        }
    }

    get activeSkills() {
        return [...this.actions].flatMap(action => action.activeSkills);
    }

    start() {
        return true;
    }

    stop() {
        return true;
    }

    activeTick() {
        this.actions.forEach(action => action.activeTick());
    }

    onModifierChangeWhileActive() {
        this.actions.forEach(action => (action.onModifierChangeWhileActive !== undefined ? action.onModifierChangeWhileActive() : undefined));
    }

    getErrorLog() {

    }
}

export { Multitasking }