import { useEffect, useState } from "react";

export type Language = "en" | "ne";

export const DICTIONARY = {
  en: {
    // Landing
    "landing.title": "When disaster happens, every second and every report matters.",
    "landing.subtitle": "SajiloResQ turns citizen reports into explainable, coordinated response actions—even when the network is unreliable.",
    "landing.report_btn": "Report an emergency",
    "landing.dashboard_btn": "Open responder dashboard",
    "landing.demo_reports": "Demo: 2 reports processed",
    "landing.demo_responders": "Demo: 1 responder notified",
    "landing.trust_title": "Built for resilience.",
    "landing.trust.offline.title": "Offline-first",
    "landing.trust.offline.desc": "Works without internet. Syncs automatically when connection returns.",
    "landing.trust.ai.title": "Explainable AI",
    "landing.trust.ai.desc": "Triage decisions are transparent, reviewable, and fast.",
    "landing.trust.human.title": "Human-approved alerts",
    "landing.trust.human.desc": "Agents recommend, but humans confirm before dispatch.",
    "landing.trust.map.title": "Map-based coordination",
    "landing.trust.map.desc": "See incidents and responders visually for faster dispatch.",
    "landing.footer": "SajiloResQ is an advisory tool for disaster coordination. It is not a replacement for official emergency services. If you are in immediate danger, contact local authorities directly if possible.",
    "landing.safety_link": "Read full safety limitations",
    "nav.login": "Responder Login",

    // Report Form
    "report.step1": "What happened?",
    "report.step2": "Describe the situation",
    "report.step3": "Location and Photo",
    "report.step4": "Review and Submit",
    "report.step5": "Confirmation",
    "report.next": "Next",
    "report.back": "Back",
    "report.submit": "Submit Report",
    
    "incident.earthquake": "Earthquake / Collapse",
    "incident.flood": "Flood / Landslide",
    "incident.fire": "Fire",
    "incident.medical": "Medical Emergency",
    "incident.road_blockage": "Road Blockage",
    "incident.other": "Other",

    "form.description": "Description",
    "form.description_placeholder": "Please provide details about the emergency...",
    "form.voice_button": "Use Voice",
    "form.voice_listening": "Listening...",
    "form.voice_unsupported": "Voice input unsupported",
    "form.voice_offline": "Voice input may require internet",
    "form.chars_left": "characters left",

    "form.photo": "Add a photo (optional)",
    "form.photo_offline": "Photos can be added when you're online",
    "form.location": "Location",
    "form.use_location": "Use my location",
    "form.location_getting": "Getting location...",
    "form.location_success": "Location acquired",
    "form.location_fallback": "Or type location here",

    "report.queue_badge": "Saved offline — will send automatically",
    "report.retry": "Retry now",
    
    "demo_honesty": "Prototype — this demo does not contact emergency services. If someone is in immediate danger, call emergency services.",

    "status.sent": "Sent",
    "status.offline": "Saved offline",
    "status.failed": "Failed",
    "status.link": "Check status",
    "status.call_emergency": "Call 100 for Police, 102 for Ambulance, or 101 for Fire if someone is in immediate danger.",

    // Status Page
    "status_page.title": "Report Status",
    "status_page.not_found": "We can't find this report on this device",
    "status_label.new": "Received — being reviewed",
    "status_label.approved": "A responder has reviewed your report",
    "status_label.acknowledged": "A responder has acknowledged your report",
    "status_label.dispatched": "Response has been dispatched",
    "status_label.resolved": "Marked resolved",
    "status_label.rejected": "Closed after review",

    // Safety Page
    "safety.title": "Safety Limitations"
  },
  ne: {
    // Landing
    "landing.title": "विपद्को समयमा, हरेक सेकेन्ड र हरेक रिपोर्ट महत्त्वपूर्ण हुन्छ।",
    "landing.subtitle": "सजिलोरेस्क्युले नागरिक रिपोर्टहरूलाई स्पष्ट, समन्वयित प्रतिक्रिया कार्यहरूमा परिणत गर्दछ—इन्टरनेट नभएको बेला पनि।",
    "landing.report_btn": "आपतकालीन रिपोर्ट गर्नुहोस्",
    "landing.dashboard_btn": "प्रतिक्रियाकर्ता ड्यासबोर्ड खोल्नुहोस्",
    "landing.demo_reports": "डेमो: २ रिपोर्टहरू प्रशोधन गरियो",
    "landing.demo_responders": "डेमो: १ प्रतिक्रियाकर्तालाई सूचित गरियो",
    "landing.trust_title": "लचिलोपनको लागि निर्मित।",
    "landing.trust.offline.title": "अफलाइन-प्रथम",
    "landing.trust.offline.desc": "इन्टरनेट बिना काम गर्छ। जडान फिर्ता आउँदा स्वचालित रूपमा सिंक हुन्छ।",
    "landing.trust.ai.title": "व्याख्यात्मक एआई",
    "landing.trust.ai.desc": "ट्रायज निर्णयहरू पारदर्शी, समीक्षा योग्य, र छिटो छन्।",
    "landing.trust.human.title": "मानव-अनुमोदित अलर्टहरू",
    "landing.trust.human.desc": "एजेन्टहरूले सिफारिस गर्छन्, तर मानिसहरूले पठाउनु अघि पुष्टि गर्छन्।",
    "landing.trust.map.title": "नक्सा-आधारित समन्वय",
    "landing.trust.map.desc": "छिटो प्रतिक्रियाको लागि घटनाहरू र प्रतिक्रियाकर्ताहरूलाई भिजुअल रूपमा हेर्नुहोस्।",
    "landing.footer": "सजिलोरेस्क्यु विपद् समन्वयका लागि सल्लाहकार उपकरण हो। यो आधिकारिक आपतकालीन सेवाहरूको विकल्प होइन। यदि तपाईं तत्काल खतरामा हुनुहुन्छ भने, सकेसम्म स्थानीय अधिकारीहरूलाई सिधै सम्पर्क गर्नुहोस्।",
    "landing.safety_link": "पूर्ण सुरक्षा सीमाहरू पढ्नुहोस्",
    "nav.login": "प्रतिक्रियाकर्ता लगइन",

    // Report Form
    "report.step1": "के भयो?",
    "report.step2": "अवस्था वर्णन गर्नुहोस्",
    "report.step3": "स्थान र फोटो",
    "report.step4": "समीक्षा र पेश गर्नुहोस्",
    "report.step5": "पुष्टिकरण",
    "report.next": "अर्को",
    "report.back": "पछाडि",
    "report.submit": "रिपोर्ट पेश गर्नुहोस्",
    
    "incident.earthquake": "भूकम्प / भत्किएको",
    "incident.flood": "बाढी / पहिरो",
    "incident.fire": "आगो",
    "incident.medical": "चिकित्सा आपतकालिन",
    "incident.road_blockage": "सडक अवरुद्ध",
    "incident.other": "अन्य",

    "form.description": "विवरण",
    "form.description_placeholder": "कृपया आपतकालिन बारे विवरण प्रदान गर्नुहोस्...",
    "form.voice_button": "आवाज प्रयोग गर्नुहोस्",
    "form.voice_listening": "सुन्दै...",
    "form.voice_unsupported": "आवाज इनपुट समर्थित छैन",
    "form.voice_offline": "आवाज इनपुटलाई इन्टरनेट चाहिन्छ",
    "form.chars_left": "अक्षर बाँकी",

    "form.photo": "फोटो थप्नुहोस् (वैकल्पिक)",
    "form.photo_offline": "तपाईं अनलाइन हुँदा फोटोहरू थप्न सकिन्छ",
    "form.location": "स्थान",
    "form.use_location": "मेरो स्थान प्रयोग गर्नुहोस्",
    "form.location_getting": "स्थान प्राप्त गर्दै...",
    "form.location_success": "स्थान प्राप्त भयो",
    "form.location_fallback": "वा यहाँ स्थान टाइप गर्नुहोस्",

    "report.queue_badge": "अफलाइन सुरक्षित गरियो - स्वचालित रूपमा पठाइनेछ",
    "report.retry": "अहिले पुन: प्रयास गर्नुहोस्",
    
    "demo_honesty": "प्रोटोटाइप — यो डेमोले आपतकालीन सेवाहरूलाई सम्पर्क गर्दैन। यदि कोही तत्काल खतरामा छ भने, आपतकालीन सेवाहरूलाई कल गर्नुहोस्।",

    "status.sent": "पठाइयो",
    "status.offline": "अफलाइन सुरक्षित गरियो",
    "status.failed": "असफल",
    "status.link": "स्थिति जाँच गर्नुहोस्",
    "status.call_emergency": "यदि कोही तत्काल खतरामा छ भने प्रहरीको लागि 100, एम्बुलेन्सको लागि 102, वा दमकलको लागि 101 मा कल गर्नुहोस्।",

    // Status Page
    "status_page.title": "रिपोर्ट स्थिति",
    "status_page.not_found": "हामीले यो उपकरणमा यो रिपोर्ट फेला पार्न सकेनौं",
    "status_label.new": "प्राप्त भयो - समीक्षा भइरहेको छ",
    "status_label.approved": "एक प्रतिक्रियाकर्ताले तपाईंको रिपोर्टको समीक्षा गरेको छ",
    "status_label.acknowledged": "एक प्रतिक्रियाकर्ताले तपाईंको रिपोर्ट स्वीकार गरेको छ",
    "status_label.dispatched": "प्रतिक्रिया पठाइएको छ",
    "status_label.resolved": "समाधान भएको चिन्ह लगाइयो",
    "status_label.rejected": "समीक्षा पछि बन्द गरियो",

    // Safety Page
    "safety.title": "सुरक्षा सीमाहरू"
  }
} as const;

export type TranslationKey = keyof typeof DICTIONARY.en;

export function useLanguage() {
  const [lang, setLang] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("sajiloresq_lang") as Language;
    if (saved === "en" || saved === "ne") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLang(saved);
      document.documentElement.lang = saved;
    }
  }, []);

  const changeLanguage = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("sajiloresq_lang", newLang);
    document.documentElement.lang = newLang;
  };

  const t = (key: TranslationKey): string => {
    return DICTIONARY[lang][key] || DICTIONARY["en"][key];
  };

  return { lang, changeLanguage, t };
}
