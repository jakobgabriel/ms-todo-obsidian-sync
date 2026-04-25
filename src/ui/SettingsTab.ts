import { App, PluginSettingTab, Setting, Notice, type ButtonComponent } from "obsidian";
import type MsTodoSyncPlugin from "../main";
import type { ListMapping } from "../types";

export class MsTodoSettingsTab extends PluginSettingTab {
  plugin: MsTodoSyncPlugin;

  constructor(app: App, plugin: MsTodoSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "MS To Do Sync Settings" });

    new Setting(containerEl)
      .setName("Azure Client ID")
      .setDesc(
        "Register an app at portal.azure.com. Set platform to 'Mobile and desktop'. " +
          "Add redirect URI: https://login.microsoftonline.com/common/oauth2/nativeclient. " +
          "Grant Tasks.ReadWrite and User.Read (Delegated) permissions."
      )
      .addText((text) =>
        text
          .setPlaceholder("xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx")
          .setValue(this.plugin.settings.clientId)
          .onChange(async (value) => {
            this.plugin.settings.clientId = value.trim();
            await this.plugin.saveSettings();
            await this.plugin.auth.reinitialize(value.trim());
          })
      );

    containerEl.createEl("h3", { text: "Authentication" });

    const authSetting = new Setting(containerEl)
      .setName("Microsoft Account")
      .setDesc("Sign in to authorize access to your To Do tasks.");

    authSetting.addButton((btn: ButtonComponent) => {
      btn.setButtonText("Checking…").setDisabled(true);

      this.plugin.auth.isSignedIn().then((signedIn) => {
        if (signedIn) {
          btn
            .setButtonText("Sign Out")
            .setDisabled(false)
            .setCta()
            .onClick(async () => {
              btn.setButtonText("Signing out…").setDisabled(true);
              try {
                await this.plugin.auth.signOut();
                new Notice("Signed out of Microsoft account.");
              } catch (e) {
                new Notice(
                  `Sign out failed: ${e instanceof Error ? e.message : String(e)}`
                );
              }
              this.display();
            });
        } else {
          btn
            .setButtonText("Sign In")
            .setDisabled(false)
            .onClick(async () => {
              if (!this.plugin.settings.clientId) {
                new Notice("Please enter your Azure Client ID first.");
                return;
              }
              btn.setButtonText("Signing in…").setDisabled(true);
              try {
                await this.plugin.auth.signIn();
                new Notice("Signed in successfully.");
                this.display();
              } catch (e) {
                new Notice(
                  `Sign in failed: ${e instanceof Error ? e.message : String(e)}`
                );
                btn.setButtonText("Sign In").setDisabled(false);
              }
            });
        }
      });
    });

    this.plugin.auth.isSignedIn().then(async (signedIn) => {
      if (!signedIn) return;

      containerEl.createEl("h3", { text: "To Do Lists" });
      containerEl.createEl("p", {
        text: "Enable lists to sync. Set the vault file path for each list.",
        cls: "setting-item-description",
      });

      let lists;
      try {
        lists = await this.plugin.todoClient.getLists();
      } catch (e) {
        containerEl.createEl("p", {
          text: `Failed to load lists: ${e instanceof Error ? e.message : String(e)}`,
          cls: "mod-warning",
        });
        return;
      }

      for (const list of lists) {
        let mapping = this.plugin.settings.listMappings.find(
          (m) => m.listId === list.id
        );
        if (!mapping) {
          mapping = {
            listId: list.id,
            listName: list.displayName,
            filePath: `${this.plugin.settings.defaultFolder}/${list.displayName}.md`,
            enabled: false,
          };
          this.plugin.settings.listMappings.push(mapping);
          await this.plugin.saveSettings();
        }

        const currentMapping: ListMapping = mapping;

        new Setting(containerEl)
          .setName(list.displayName)
          .setDesc("Vault file path for this list")
          .addToggle((toggle) =>
            toggle.setValue(currentMapping.enabled).onChange(async (value) => {
              currentMapping.enabled = value;
              await this.plugin.saveSettings();
            })
          )
          .addText((text) =>
            text
              .setValue(currentMapping.filePath)
              .setPlaceholder("MS To Do/My List.md")
              .onChange(async (value) => {
                currentMapping.filePath = value;
                await this.plugin.saveSettings();
              })
          );
      }

      containerEl.createEl("h3", { text: "Sync" });

      new Setting(containerEl)
        .setName("Sync Now")
        .setDesc("Manually trigger a full sync of all enabled lists.")
        .addButton((btn) =>
          btn
            .setButtonText("Sync Now")
            .setCta()
            .onClick(async () => {
              btn.setButtonText("Syncing…").setDisabled(true);
              try {
                await this.plugin.runSync();
              } finally {
                btn.setButtonText("Sync Now").setDisabled(false);
              }
            })
        );
    });

    containerEl.createEl("h3", { text: "Defaults" });

    new Setting(containerEl)
      .setName("Default folder")
      .setDesc("Folder used when generating default file paths for new lists.")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.defaultFolder)
          .setPlaceholder("MS To Do")
          .onChange(async (value) => {
            this.plugin.settings.defaultFolder = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Auto-sync interval (minutes)")
      .setDesc(
        "Set to 0 to disable auto-sync. Changes take effect after restarting Obsidian."
      )
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.syncInterval))
          .setPlaceholder("0")
          .onChange(async (value) => {
            const parsed = parseInt(value, 10);
            this.plugin.settings.syncInterval = isNaN(parsed) ? 0 : parsed;
            await this.plugin.saveSettings();
          })
      );
  }
}
