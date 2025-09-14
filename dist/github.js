"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentPR = commentPR;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
async function commentPR(message) {
    const pr = github.context.payload.pull_request;
    if (!pr) {
        core.setFailed("❌ This action only runs on pull_request events.");
        return;
    }
    if (!process.env.GITHUB_TOKEN) {
        core.setFailed("❌ GITHUB_TOKEN is not set.");
        return;
    }
    const prNumber = pr.number;
    const { owner, repo } = github.context.repo;
    const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
    const { data: comments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: prNumber,
    });
    const alreadyCommented = comments.some((c) => c.body?.includes(message));
    if (alreadyCommented) {
        return;
    }
    else {
        core.info(`💬 Commenting on PR #${prNumber}: ${message}`);
        // log all comments
        comments.forEach((c) => core.info(`🗨️ Existing comment: ${c.body}`));
    }
    await octokit.rest.issues.createComment({
        owner: owner,
        repo: repo,
        issue_number: prNumber,
        body: message,
    });
}
