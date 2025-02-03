import * as path from 'path';
import { openAsBlob } from 'node:fs';
import { Agent } from 'undici';

interface Attachment{
    id: string,
    title: string
}

export interface ConfluenceUploaderOptions {
    host: string,
    token: string
}

export class ConfluenceUploader {
    private agent: Agent;

    constructor(
        private options: ConfluenceUploaderOptions) {
        this.agent = new Agent({ connect: { rejectUnauthorized: false } })
    }

    async upload(filename: string, pageId: string) {
        const form = new FormData();

        form.append('file', await openAsBlob(filename), `${path.basename(filename)}`);

        const attachmentId = await this.getAttachmentId(pageId, path.basename(filename));

        const response = await fetch(this.getUploadUrl(pageId, attachmentId), {
            dispatcher: this.agent,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.options.token}`,
                'X-Atlassian-Token': 'no-check',
            },
            body: form
        });

        await this.ensureSuccess(response, `Failed to upload ${filename} to ${pageId}`);
        console.debug(`Uploaded ${filename} to ${pageId}`)
    }

    private async getAttachmentId(pageId: string, filename: string): Promise<string> {
        const response = await fetch(`${this.options.host}/rest/api/content/${pageId}/child/attachment?filename=${filename}`, {
            dispatcher: this.agent,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.options.token}`,
                'X-Atlassian-Token': 'no-check',
                'Accept': 'application/json'
            },
        });

        await this.ensureSuccess(response, `Failed to get attachment id for ${filename} to ${pageId}`);

        const responseContent: {results: Attachment[]} = <any>(await response.json());
        
        return (responseContent?.results ?? [])[0]?.id;
    }

    private getUploadUrl(pageId: string, attachmentId?: string): string {
        return !!attachmentId
            ? `${this.options.host}/rest/api/content/${pageId}/child/attachment/${attachmentId}/data`
            : `${this.options.host}/rest/api/content/${pageId}/child/attachment`;
    }

    private async ensureSuccess(response: Response, message: string): Promise<Response> {
        if (!response.ok) {
            const responseText = await response.text();

            console.error(`${message}\n${responseText}`);
            throw new Error(`Request to ${response.url} failed with status ${response.status}\n${responseText}`);
        }

        return response;
    }
}