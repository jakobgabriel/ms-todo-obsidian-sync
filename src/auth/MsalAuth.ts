import {
	PublicClientApplication,
	type Configuration,
	type AccountInfo,
	type AuthenticationResult,
} from "@azure/msal-browser";

const SCOPES = ["Tasks.ReadWrite", "User.Read"];

export class MsalAuth {
	private msalInstance: PublicClientApplication;
	private initialized = false;
	private clientId: string;

	constructor(clientId: string) {
		this.clientId = clientId;
		this.msalInstance = this.buildInstance(clientId);
	}

	private buildInstance(clientId: string): PublicClientApplication {
		const config: Configuration = {
			auth: {
				clientId,
				authority: "https://login.microsoftonline.com/common",
				redirectUri: "https://login.microsoftonline.com/common/oauth2/nativeclient",
				postLogoutRedirectUri: "https://login.microsoftonline.com/common/oauth2/nativeclient",
			},
			cache: {
				cacheLocation: "localStorage",
				storeAuthStateInCookie: false,
			},
			system: {
				loggerOptions: {
					loggerCallback: () => { /* suppress MSAL console output */ },
					piiLoggingEnabled: false,
				},
			},
		};
		return new PublicClientApplication(config);
	}

	private async ensureInitialized(): Promise<void> {
		if (!this.initialized) {
			await this.msalInstance.initialize();
			this.initialized = true;
		}
	}

	async signIn(): Promise<void> {
		await this.ensureInitialized();
		const result: AuthenticationResult = await this.msalInstance.loginPopup({
			scopes: SCOPES,
		});
		this.msalInstance.setActiveAccount(result.account);
	}

	async getToken(): Promise<string | null> {
		await this.ensureInitialized();
		const accounts = this.msalInstance.getAllAccounts();
		if (accounts.length === 0) return null;

		// Non-null assertion is safe: we confirmed accounts.length > 0 above.
		// noUncheckedIndexedAccess requires explicit assertion for index access.
		const account: AccountInfo = accounts[0]!;
		this.msalInstance.setActiveAccount(account);

		try {
			const result = await this.msalInstance.acquireTokenSilent({
				scopes: SCOPES,
				account,
			});
			return result.accessToken;
		} catch {
			try {
				const result = await this.msalInstance.acquireTokenPopup({
					scopes: SCOPES,
					account,
				});
				return result.accessToken;
			} catch {
				return null;
			}
		}
	}

	async signOut(): Promise<void> {
		await this.ensureInitialized();
		const accounts = this.msalInstance.getAllAccounts();
		if (accounts.length === 0) return;
		await this.msalInstance.logoutPopup({
			account: accounts[0]!,
		});
	}

	async isSignedIn(): Promise<boolean> {
		await this.ensureInitialized();
		return this.msalInstance.getAllAccounts().length > 0;
	}

	async reinitialize(clientId: string): Promise<void> {
		if (clientId === this.clientId) return;
		this.clientId = clientId;
		this.initialized = false;
		this.msalInstance = this.buildInstance(clientId);
	}
}
