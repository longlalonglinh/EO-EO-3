import { CustomPracticeDeck } from '../types/practice';

export const STARTER_PRACTICE_DECKS: CustomPracticeDeck[] = [
  {
    deck_id: 'ON_TAP_01',
    title: 'General English & High-Frequency Academic Vocabulary',
    category: 'Vocabulary',
    description: 'Rèn luyện phản xạ từ vựng học thuật, ngữ cảnh câu thực tế và nâng cao vốn từ cho kỳ thi.',
    target_language: 'English',
    native_language: 'Vietnamese',
    level: 'B1-B2',
    icon: 'Sparkles',
    cover_gradient: 'from-indigo-600 via-purple-600 to-pink-500',
    cards: [
      {
        id: 'c1',
        sentence_en: 'The government has implemented stricter regulations to _____ industrial air pollution.',
        sentence_vi: 'Chính phủ đã thực thi các quy định nghiêm ngặt hơn để kiềm chế ô nhiễm không khí công nghiệp.',
        cloze_target: 'curb',
        target_word: 'curb',
        part_of_speech: 'verb',
        phonetic: '/kɜːb/',
        hints: 'kiềm chế, hạn chế, ngăn chặn (động từ)',
        accepted_answers: ['curb', 'curbing', 'limit', 'reduce'],
        explanation: 'Cụm "curb pollution" (kiềm chế ô nhiễm) là một collocation học thuật phổ biến. Sau to-infinitive mục đích cần động từ nguyên mẫu.',
        grammar_points: [
          'Collocation: curb pollution / curb emissions',
          'Ngữ pháp: To-infinitive of purpose (để làm gì)',
          'Từ đồng nghĩa: restrain, suppress, restrict'
        ],
        options: ['curb', 'curbed', 'curbing', 'curbment'],
        difficulty: 'medium'
      },
      {
        id: 'c2',
        sentence_en: 'Renewable energy plays a _____ role in combating global climate change.',
        sentence_vi: 'Năng lượng tái tạo đóng một vai trò then chốt trong việc chống lại biến đổi khí hậu toàn cầu.',
        cloze_target: 'pivotal',
        target_word: 'pivotal',
        part_of_speech: 'adjective',
        phonetic: '/ˈpɪv.ə.təl/',
        hints: 'then chốt, mang tính quyết định (tính từ)',
        accepted_answers: ['pivotal', 'crucial', 'vital', 'key'],
        explanation: '"Play a pivotal role in" là cụm từ rất quan trọng trong tiếng Anh mang nghĩa đóng vai trò cốt lõi/then chốt.',
        grammar_points: [
          'Collocation: play a pivotal role in + V-ing / Noun',
          'Vị trí từ loại: Đứng trước danh từ "role" cần một tính từ',
          'Từ đồng nghĩa: crucial, vital, paramount'
        ],
        options: ['pivotal', 'pivot', 'pivotally', 'pivoting'],
        difficulty: 'easy'
      },
      {
        id: 'c3',
        sentence_en: 'Many young graduates struggle to _____ the gap between theoretical knowledge and practical workplace skills.',
        sentence_vi: 'Nhiều sinh viên mới tốt nghiệp chật vật để thu hẹp khoảng cách giữa kiến thức lý thuyết và kỹ năng thực tế.',
        cloze_target: 'bridge',
        target_word: 'bridge',
        part_of_speech: 'verb',
        phonetic: '/brɪdʒ/',
        hints: 'thu hẹp, bắc cầu, kết nối (động từ)',
        accepted_answers: ['bridge', 'bridging', 'close', 'narrow'],
        explanation: 'Collocation kinh điển "bridge the gap" nghĩa là thu hẹp khoảng cách giữa hai khía cạnh.',
        grammar_points: [
          'Collocation: bridge the gap between A and B',
          'Cấu trúc: struggle to + V (vật lộn, chật vật làm gì)',
          'Ngữ cảnh: Giáo dục & việc làm'
        ],
        options: ['bridge', 'bridged', 'bridging', 'bridges'],
        difficulty: 'medium'
      },
      {
        id: 'c4',
        sentence_en: 'The scientist conducted several experiments to _____ the hypotheses proposed last year.',
        sentence_vi: 'Nhà khoa học đã thực hiện nhiều thí nghiệm để chứng minh/xác thực các giả thuyết được đưa ra năm ngoái.',
        cloze_target: 'substantiate',
        target_word: 'substantiate',
        part_of_speech: 'verb',
        phonetic: '/səbˈstæn.ʃi.eɪt/',
        hints: 'chứng minh, xác thực (động từ)',
        accepted_answers: ['substantiate', 'verify', 'prove', 'validate'],
        explanation: '"Substantiate a hypothesis / claim" nghĩa là đưa ra chứng cứ xác thực một tuyên bố hoặc giả thuyết.',
        grammar_points: [
          'Từ loại: Động từ nguyên mẫu sau to-infinitive',
          'Rút gọn mệnh đề quan hệ: "hypotheses proposed last year" = "hypotheses which were proposed..."',
          'Word family: Substantial (adj), Substance (n)'
        ],
        options: ['substantiate', 'substantial', 'substantiation', 'substantially'],
        difficulty: 'hard'
      },
      {
        id: 'c5',
        sentence_en: 'Prolonged exposure to excessive screen time can be _____ to children\'s cognitive development.',
        sentence_vi: 'Việc tiếp xúc quá nhiều với màn hình thiết bị trong thời gian dài có thể gây hại cho sự phát triển nhận thức của trẻ em.',
        cloze_target: 'detrimental',
        target_word: 'detrimental',
        part_of_speech: 'adjective',
        phonetic: '/ˌdet.rɪˈmen.təl/',
        hints: 'có hại, bất lợi (tính từ)',
        accepted_answers: ['detrimental', 'harmful', 'damaging', 'adverse'],
        explanation: '"Be detrimental to something" là cụm tính từ chỉ sự gây hại hoặc đem lại tác động tiêu cực.',
        grammar_points: [
          'Giới từ: detrimental TO something (không dùng with hay for)',
          'Cấu trúc: be + adjective + to + noun phrase',
          'Từ trái nghĩa: beneficial, advantageous'
        ],
        options: ['detrimental', 'detriment', 'detrimentally', 'detriments'],
        difficulty: 'medium'
      },
      {
        id: 'c6',
        sentence_en: 'The local community took the _____ to launch a city-wide recycling initiative.',
        sentence_vi: 'Cộng đồng địa phương đã chủ động / nắm quyền chủ động khởi xướng sáng kiến tái chế toàn thành phố.',
        cloze_target: 'initiative',
        target_word: 'initiative',
        part_of_speech: 'noun',
        phonetic: '/ɪˈnɪʃ.ə.tɪv/',
        hints: 'sáng kiến, sự chủ động (danh từ)',
        accepted_answers: ['initiative', 'initiatives'],
        explanation: 'Thành ngữ / Collocation "take the initiative" có nghĩa là chủ động bắt đầu một hành động hoặc kế hoạch.',
        grammar_points: [
          'Collocation: take the initiative to do something',
          'Word family: Initiate (verb), Initial (adj), Initiative (noun)',
          'Ngữ cảnh: Môi trường & hành động xã hội'
        ],
        options: ['initiative', 'initiate', 'initially', 'initiation'],
        difficulty: 'medium'
      },
      {
        id: 'c7',
        sentence_en: 'Economic analysts forecast that inflation will gradually _____ over the next two quarters.',
        sentence_vi: 'Các nhà phân tích kinh tế dự báo rằng lạm phát sẽ giảm bớt / dịu đi dần trong hai quý tới.',
        cloze_target: 'subside',
        target_word: 'subside',
        part_of_speech: 'verb',
        phonetic: '/səbˈsaɪd/',
        hints: 'giảm bớt, lắng xuống, dịu đi (động từ)',
        accepted_answers: ['subside', 'decrease', 'decline', 'moderate'],
        explanation: '"Subside" diễn tả sự dịu lại, suy giảm cường độ của lạm phát, bão gió, cơn đau hoặc sự giận dữ.',
        grammar_points: [
          'Thì: Tương lai đơn với will + V-inf',
          'Trạng từ bổ nghĩa: gradually subside',
          'Từ đồng nghĩa: abate, diminish, ease off'
        ],
        options: ['subside', 'subsidence', 'subsiding', 'subsided'],
        difficulty: 'hard'
      },
      {
        id: 'c8',
        sentence_en: 'We need to foster an environment where employees feel empowered to express their opinions _____ .',
        sentence_vi: 'Chúng ta cần nuôi dưỡng một môi trường nơi nhân viên cảm thấy được trao quyền để bày tỏ ý kiến một cách cởi mở.',
        cloze_target: 'candidly',
        target_word: 'candidly',
        part_of_speech: 'adverb',
        phonetic: '/ˈkæn.dɪd.li/',
        hints: 'thẳng thắn, cởi mở, chân thành (trạng từ)',
        accepted_answers: ['candidly', 'openly', 'frankly', 'freely'],
        explanation: 'Trạng từ "candidly" (hoặc openly, frankly) đứng ở cuối câu để bổ nghĩa cho động từ "express their opinions".',
        grammar_points: [
          'Vị trí từ loại: Trạng từ đứng sau tân ngữ để bổ nghĩa cho động từ express',
          'Word family: Candid (adj - ngay thẳng), Candor (n - tính bộc trực)',
          'Collocation: speak candidly, express candidly'
        ],
        options: ['candidly', 'candid', 'candor', 'candidness'],
        difficulty: 'medium'
      }
    ]
  },
  {
    deck_id: 'GRAMMAR_MASTER',
    title: 'Essential Grammar & Advanced Sentence Structures',
    category: 'Grammar',
    description: 'Nắm vững các cấu trúc câu nâng cao: đảo ngữ, câu điều kiện hỗn hợp, mệnh đề quan hệ và phân từ.',
    target_language: 'English',
    native_language: 'Vietnamese',
    level: 'B1-B2',
    icon: 'BookOpen',
    cover_gradient: 'from-blue-600 via-cyan-600 to-teal-500',
    cards: [
      {
        id: 'g1',
        sentence_en: 'Not until the investigation was completed _____ the authorities reveal the full report.',
        sentence_vi: 'Mãi cho đến khi cuộc điều tra hoàn tất thì các nhà chức trách mới công bố toàn bộ báo cáo.',
        cloze_target: 'did',
        target_word: 'did',
        part_of_speech: 'auxiliary verb',
        phonetic: '/dɪd/',
        hints: 'trợ động từ đảo ngữ thì quá khứ đơn',
        accepted_answers: ['did'],
        explanation: 'Cấu trúc đảo ngữ: "Not until + Clause/Time + Trợ động từ + S + V-bare". Vì sự việc ở quá khứ nên trợ động từ là "did".',
        grammar_points: [
          'Quy tắc Đảo ngữ (Inversion): Not until + S1 + V1 + Auxiliary + S2 + V2',
          'Thì Quá khứ đơn: mượn did cho câu khẳng định đảo ngữ',
          'Lỗi hay gặp: Quên đảo ngữ ở mệnh đề chính'
        ],
        options: ['did', 'had', 'was', 'were'],
        difficulty: 'hard'
      },
      {
        id: 'g2',
        sentence_en: 'If he had followed the doctor\'s advice, he _____ be feeling much better today.',
        sentence_vi: 'Nếu anh ấy đã nghe theo lời khuyên của bác sĩ thì hôm nay anh ấy đã cảm thấy khỏe hơn nhiều rồi.',
        cloze_target: 'would',
        target_word: 'would',
        part_of_speech: 'modal verb',
        phonetic: '/wʊd/',
        hints: 'động từ khuyết thiếu trong câu điều kiện hỗn hợp',
        accepted_answers: ['would', 'might', 'could'],
        explanation: 'Câu điều kiện hỗn hợp loại 3-2: Giả định trái ngược trong quá khứ (had followed) dẫn đến kết quả ở hiện tại (today -> would + V-inf).',
        grammar_points: [
          'Mixed Conditional (3-2): If + Past Perfect, S + would/could + V-bare (now/today)',
          'Dấu hiệu thời gian: "today" ở mệnh đề chính',
          'Khác với loại 3 thuần túy (would have + V3)'
        ],
        options: ['would', 'would have', 'will', 'had'],
        difficulty: 'hard'
      },
      {
        id: 'g3',
        sentence_en: 'The proposal, _____ by the board of directors yesterday, will take effect next month.',
        sentence_vi: 'Đề xuất, được phê duyệt bởi ban giám đốc ngày hôm qua, sẽ có hiệu lực vào tháng tới.',
        cloze_target: 'approved',
        target_word: 'approved',
        part_of_speech: 'past participle',
        phonetic: '/əˈpruːvd/',
        hints: 'quá khứ phân từ dạng bị động',
        accepted_answers: ['approved', 'ratified', 'passed'],
        explanation: 'Rút gọn mệnh đề quan hệ ở dạng bị động: "which was approved by..." rút gọn thành phân từ 2 "approved".',
        grammar_points: [
          'Reduced Relative Clause: Dạng bị động dùng Past Participle (V-ed/V3)',
          'Dấu phẩy ngăn cách mệnh đề không xác định',
          'Collocation: take effect (có hiệu lực)'
        ],
        options: ['approved', 'approving', 'approve', 'approval'],
        difficulty: 'medium'
      },
      {
        id: 'g4',
        sentence_en: 'It is vital that every participant _____ notified of the schedule changes immediately.',
        sentence_vi: 'Điều quan trọng là mọi người tham gia phải được thông báo về những thay đổi lịch trình ngay lập tức.',
        cloze_target: 'be',
        target_word: 'be',
        part_of_speech: 'subjunctive verb',
        phonetic: '/biː/',
        hints: 'động từ to be nguyên thể dạng giả định',
        accepted_answers: ['be', 'should be', 'is'],
        explanation: 'Cấu trúc câu giả định thức (Subjunctive Mood): "It is vital/essential/necessary that + S + (should) + V-bare/be + V3".',
        grammar_points: [
          'Subjunctive Mood: It is vital that + S + (be/V-bare)',
          'Dạng bị động trong giả định thức: be + V3/ed (be notified)',
          'Lỗi hay gặp: Chia "is notified" hoặc "was notified"'
        ],
        options: ['be', 'is', 'was', 'being'],
        difficulty: 'hard'
      }
    ]
  },
  {
    deck_id: 'COMMUNICATION_01',
    title: 'Daily Communication & Natural Expressions',
    category: 'Communication',
    description: 'Từ vựng và thành ngữ tự nhiên dùng trong giao tiếp công sở, du lịch và đời sống hàng ngày.',
    target_language: 'English',
    native_language: 'Vietnamese',
    level: 'A1-A2',
    icon: 'MessageSquare',
    cover_gradient: 'from-emerald-600 via-teal-600 to-green-500',
    cards: [
      {
        id: 'cm1',
        sentence_en: 'Could you please give me a _____ with these heavy boxes?',
        sentence_vi: 'Bạn có thể vui lòng giúp tôi một tay với những chiếc hộp nặng này không?',
        cloze_target: 'hand',
        target_word: 'hand',
        part_of_speech: 'noun',
        phonetic: '/hænd/',
        hints: 'giúp một tay (thành ngữ: give someone a hand)',
        accepted_answers: ['hand'],
        explanation: 'Idiom "give someone a hand" = giúp đỡ ai đó một tay.',
        grammar_points: [
          'Idiom: give somebody a hand with something',
          'Câu đề nghị lịch sự: Could you please + V... ?'
        ],
        options: ['hand', 'arm', 'help', 'finger'],
        difficulty: 'easy'
      },
      {
        id: 'cm2',
        sentence_en: 'I am really looking forward to _____ from you soon.',
        sentence_vi: 'Tôi rất mong sớm nhận được tin từ bạn.',
        cloze_target: 'hearing',
        target_word: 'hearing',
        part_of_speech: 'gerund',
        phonetic: '/ˈhɪə.rɪŋ/',
        hints: 'nghe tin tức (danh động từ sau to)',
        accepted_answers: ['hearing'],
        explanation: 'Cấu trúc "look forward to + V-ing" (chờ đợi, mong ngóng điều gì). Giới từ "to" ở đây đi kèm V-ing.',
        grammar_points: [
          'Cấu trúc cố định: look forward to + V-ing / Noun',
          'Lỗi phổ biến: Dùng "hear" thay vì "hearing"'
        ],
        options: ['hearing', 'hear', 'heard', 'hears'],
        difficulty: 'easy'
      },
      {
        id: 'cm3',
        sentence_en: 'Let\'s call it a _____ and continue working on this project tomorrow morning.',
        sentence_vi: 'Hôm nay chúng ta hãy dừng lại tại đây và tiếp tục làm dự án này vào sáng mai nhé.',
        cloze_target: 'day',
        target_word: 'day',
        part_of_speech: 'noun',
        phonetic: '/deɪ/',
        hints: 'dừng lại, kết thúc ngày làm việc (thành ngữ: call it a day)',
        accepted_answers: ['day'],
        explanation: 'Thành ngữ "call it a day" = kết thúc công việc trong ngày để nghỉ ngơi.',
        grammar_points: [
          'Idiom: Call it a day (nghỉ tay, dừng công việc)',
          'Cấu trúc đề xuất: Let\'s + V-bare'
        ],
        options: ['day', 'night', 'time', 'break'],
        difficulty: 'easy'
      }
    ]
  }
];
