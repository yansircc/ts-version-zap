// .src/config/setupConfig.ts
import * as fs from 'fs';
import inquirer from 'inquirer';

interface Answers {
    [key: string]: string | undefined;
    aiSelected: string; // 保留已知属性
}

async function main() {

    const questions = [
        {
            type: 'list',
            name: 'aiSelected',
            message: '请选择 AI 服务:',
            choices: ['OPENAI', 'GEMINI(暂不支持)', 'GPTs(暂不支持)', 'fastGPT'],
        },
        {
            type: 'input',
            name: 'openai_Key',
            message: '请输入 OEPNAI_KEY:',
            when: (answers: { aiSelected: string; }) => answers.aiSelected === 'OPENAI',
        },
        {
            type: 'input',
            name: 'openAI_Endpoint',
            message: '请输入 OEPNAI_ENDPOINT:',
            default: 'https://api.openai.com',
            when: (answers: { aiSelected: string; }) => answers.aiSelected === 'OPENAI',
        },
        {
            type: 'input',
            name: 'gemini_Key',
            message: '请输入 GEMINI_KEY:',
            when: (answers: { aiSelected: string; }) => answers.aiSelected === 'GEMINI',
        },
        {
            type: 'input',
            name: 'openAI_Key',
            message: '请输入 OPENAI_KEY:',
            when: (answers: { aiSelected: string; }) => answers.aiSelected === 'GPTs',
        },
        {
            type: 'input',
            name: 'open_AIAssistant',
            message: '请输入 OPENAI_ASSISTANT:',
            when: (answers: { aiSelected: string; }) => answers.aiSelected === 'GPTs',
        },
        {
            type: 'input',
            name: 'fastGPT_Key',
            message: '请输入米课AI的API KEY:',
            when: (answers: { aiSelected: string; }) => answers.aiSelected === 'fastGPT',
        },
        // {
        //     type: 'input',
        //     name: 'fastGPT_Endpoint',
        //     message: '请输入米课AI终端地址，默认https://gpt.imiker.com/api:',
        //     default: 'https://gpt.imiker.com/api',
        //     when: (answers: { aiSelected: string; }) => answers.aiSelected === 'fastGPT',
        //     validate: (input: string) => {
        //         // 使用正则表达式来验证URL的有效性
        //         const pattern = new RegExp('^(https?:\\/\\/)?' + // 协议
        //             '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // 域名
        //             '((\\d{1,3}\\.){3}\\d{1,3}))' + // 或IP (v4)地址
        //             '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // 端口和路径
        //             '(\\?[;&a-z\\d%_.~+=-]*)?' + // 查询字符串
        //             '(\\#[-a-z\\d_]*)?$', 'i'); // 锚点
        //         if (!pattern.test(input)) {
        //             return '请输入一个有效的URL地址。';
        //         }
        //         return true;
        //     },
        // },
        {
            type: 'input',
            name: 'wpp_Session_Name',
            message: '请输入你的英文名，默认YANSIR:',
            default: 'YANSIR',
            validate: (input: string) => {
                // 允许字母、数字、下划线和减号
                const isValid = /^[a-zA-Z0-9_-]+$/.test(input);
                if (!isValid) {
                    return '只允许字母、数字、下划线和减号。';
                }
                return true;
            },
        }
        ,
        {
            type: 'input',
            name: 'human_Intervention_Keyword',
            message: '请输入人工干预关键词，默认".":',
            default: '.',
            validate: (input: string) => {
                // 检查输入是否包含空格
                if (input.includes(' ')) {
                    return '关键词中不能包含空格，请重新输入。';
                }
                return true;
            },
        },
        {
            type: 'input',
            name: 'ai_Intervention_Keyword',
            message: '请输入AI干预关键词，默认",":',
            default: ',',
            validate: (input: string) => {
                // 检查输入是否包含空格
                if (input.includes(' ')) {
                    return '关键词中不能包含空格，请重新输入。';
                }
                return true;
            },
        },
    ];

    const answers: Answers = await inquirer.prompt(questions);

    // 构建.env文件内容，安全地访问answers对象的属性
    const envContent = Object.keys(answers)
        .filter((key) => answers[key] !== undefined) // 过滤未定义的值
        .map((key) => `${key.toUpperCase()}="${answers[key]}"`)
        .join('\n');

    // 写入.env文件
    try {
        fs.writeFileSync('.env', envContent);
        console.log('配置已保存至 .env 文件。');
    } catch (error) {
        console.error('保存配置时出错:', error);
    }
}

main();
