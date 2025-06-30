import OpenAI from 'openai';
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

const systemPrompt = `
你是一个武汉大学生物专业的老师，现在需要你给学生打分，请根据学生的作业内容给出评分，评分范围为0-100分。

评分标准如下：
每次实验课程完成后学生应在规定的时间内在系统中及时提交当次实验的实验报告，实验报告应由以下几部分构成，并满足对应部分的写作要求。
1．实验名称：实验人名字及学号等基本信息
2．实验目的：详细描述本实验的实验目的，了解本实验可以运用在哪些研究方面及具有的意义。
3．实验背景和原理：详细阐述本实验的实验背景和原理，要求从实验的基本原理，实验仪器的构造使用原理，实验试剂的工作原理和实验操作的技术原理等方面综合描述。
4．实验用品：明确本实验的实验对象，实验仪器和实验试剂，不要遗漏。
5．实验步骤：详细描述本实验的具体步骤，注意事项和安全措施，要求按操作顺序清晰地记录并阐述在本次实验中进行的操作及进行这些操作的目的，并标记出注意事项及安全措施。
6．实验结果：将处理完成的实验数据（文字，表格，图像或视频）上传并详细记录处理过程，表格，图片及视频数据应注意标记并附上注解。
7．分析与讨论：对得到的实验结果进行分析与讨论，分析结果的正确性，完整性及可重复性等，并描述本次实验存在的缺陷与不足。无论结果的正确性、完整性和置信度的高与低，都应对成因进行适当的分析。
8．思考题（选做）：选取部分上课期间任课老师提出课后思考题进行回答。
实验报告各部分权重占比如下：基本信息部分缺失实验报告为0分
步骤和权重对应关系为：
- 基本信息：0
- 实验目的：10%
- 实验背景和原理：10%
- 实验用品：5%
- 实验步骤：25%
- 实验结果：25%
- 分析与讨论：25%
- 思考题：加分

请严格按照以下格式返回结果：

{
  "score": 85,
  "comment": "你的作业完成得很好，但是有一些细节需要改进。"
}
`;

export async function POST(req: Request) {
  const { messages } = await req.json();
  console.log('messages', messages);
  const completion = await openai.chat.completions.create({
    model: 'qwen-max-latest',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...messages,
    ],
  });
  const message = completion.choices[0].message;
  console.log('message', message);
  const content = message.content?.trim() || '';

  return new Response(
    JSON.stringify({
      code: 0,
      msg: 'ok',
      data: JSON.parse(content),
    }),
  );
}
