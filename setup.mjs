export async function setup(ctx) {
  const SETTING_GENERAL = ctx.settings.section('General');
  const title = 'Multitasking';
  SETTING_GENERAL.add([{
      'type': 'switch',
      'name': `multitasking-enable`,
      'label': `Enable ${title}`,
      'default': true
  }]);

  await ctx.loadTemplates("templates.html"); // Add templates
  
  const { Multitasking } = await ctx.loadModule('src/multitasking.mjs');
  let multitasking = new Multitasking(game.registeredNamespaces.getNamespace('multitasking'), 'multitasking', game, ctx);
  
  game.multitasking = multitasking;
  game.actions.registerObject(multitasking);
  game.activeActions.registerObject(multitasking);

  await ctx.gameData.addPackage('data.json'); // Add skill data (page + sidebar, skillData)

  //Set Settings
  ctx.onCharacterSelectionLoaded(ctx => {
    const SETTING_DISPLAY = ctx.settings.section('Behavior Type');
    SETTING_DISPLAY.add(
        [{
            type: 'label',
            label: 'Choose whether to multitask all skills or just 1 Combat and 1 Non-Combat',
            name: 'label-multitask-style'
        },
        {
            type: 'radio-group',
            name: `multitask-style`,
            label: '',
            default: "0",
            options: [
                { value: "0", label: "All", hint: "" },
                { value: "1", label: "1 Combat and 1 Non-Combat", hint: "" }
            ]
        }]
      );
  });

  //Set Mod
  ctx.onModsLoaded(() => {
    ctx.patch(Thieving, 'resetActionState').replace(function(o) {
      if(this.isActive && !multitasking.actions.has(this))
        o();
    });

    ctx.patch(Game, 'idleChecker').replace(function(o, skill) {
      if (this.activeAction === multitasking) {
          return false;
      }
      return o(skill);
    });

    ctx.patch(Game, 'clearActiveAction').replace(function(o, save=true) {
      if (!this.disableClearOffline) {
          this.activeAction = multitasking;
          if (save)
              this.scheduleSave();
          deleteScheduledPushNotification('offlineSkill');
      }
    });

    let patchedRenderGameTitle = ctx.patch(Game, 'renderGameTitle');
    let shouldRenderGameTitle = false;
    patchedRenderGameTitle.before(function() {
      shouldRenderGameTitle = this.renderQueue.title;
    });
    patchedRenderGameTitle.after(function() {
      if(shouldRenderGameTitle) {
        if(this.activeAction === multitasking && (multitasking.actions.has(this.combat) || multitasking.actions.has(this.thieving))){
          $('title').text(`${getLangString('SKILL_NAME_Hitpoints')} ${numberWithCommas(this.combat.player.hitpoints)}`);
        }
        shouldRenderGameTitle = false
      }
    });

    let patchedRenderCombatMinibar = ctx.patch(Game, 'renderCombatMinibar');
    let shouldRenderCombatMinibar = false;
    patchedRenderCombatMinibar.before(function() {
      shouldRenderCombatMinibar = this.renderQueue.combatMinibar;
    });

    patchedRenderCombatMinibar.after(function() {
      if(shouldRenderCombatMinibar) {
        const minibar = document.getElementById('combat-footer-minibar');
        if(this.activeAction === multitasking && (multitasking.actions.has(this.combat))) {
          showElement(minibar);
        } else {
          hideElement(minibar);
        }
      }
    });

    ctx.patch(BaseManager, 'checkDeath').before(function() {
      const playerDied = this.player.hitpoints <= 0;
      if(playerDied && multitasking.actions.has(this.game.thieving))
        this.game.thieving.stopOnDeath();
    });

    ctx.patch(CombatManager, 'onSelection').after(function() {
      if(SETTING_GENERAL.get(`multitasking-enable`)) {
        multitasking.addAction(this);
        this.game.activeAction = multitasking;
      }
    });

    ctx.patch(CombatManager, 'stop').after(function(stopped) {
      if(stopped)
        multitasking.removeAction(this);
      return stopped;
    });

    game.activeActions.forEach(action => {
      if(action instanceof Skill) {
        if(action.start !== undefined) {
          ctx.patch(action.constructor, 'start').after(function(started) {
            if(!SETTING_GENERAL.get(`multitasking-enable`)) {
              this.game.activeAction = action;
              return started;
            }
            if(started) {
              multitasking.addAction(this);
              this.game.activeAction = multitasking;
            }
            return started;
          });
        } else {
          if(Cartography !== undefined && action.constructor === Cartography) {
            let startActions = ['startAutoSurvey', 'startSurveyQueue', 'startMakingPaper', 'startUpgradingMap'];
            startActions.forEach(startAction => {
              ctx.patch(action.constructor, startAction).after(function(started) {
                if(!SETTING_GENERAL.get(`multitasking-enable`)) {
                  this.game.activeAction = action;
                  return started;
                }
                if(started) {
                  multitasking.addAction(this);
                  this.game.activeAction = multitasking;
                }
                return started;
              });
            })
          }
          else if(RaidManager !== undefined && action.constructor === RaidManager) {
            console.log('Action Caught unhandled variable with RaidManager!\nIf you see this, this means RaidManager needs to be added to multitasking!');
          }
          else {
            console.log('Action Caught unhandled variable <' + action + '>\nIf you see this, this means ' + action + ' needs to be added to multitasking!');
          }
        }
      
        ctx.patch(action.constructor, 'stop').after(function(stopped) {
          if(stopped)
            multitasking.removeAction(this);
          return stopped;
        });
      }
    });
/*  UNKNOWN ERROR... Stops everything else though...
    patch(RaidManager, 'preStartRaid').replace(function() {
      return;
    });
*/
ctx.patch(Game, 'onLoad').before(function() {
    this.activeActions.forEach(action => {
      if(action.isActive && action !== multitasking)
        multitasking.addAction(action);
      });
    });
  });
}