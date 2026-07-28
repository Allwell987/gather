import * as Localization from 'expo-localization';

export type AppLocale = 'en' | 'fr';
export type TranslationKey =
  | 'today'
  | 'dailyDevotional'
  | 'markAsRead'
  | 'readDone'
  | 'noDevotionalToday'
  | 'savedAtPhrase'
  | 'savedOfflineTitle'
  | 'savedOfflineRsvp'
  | 'savedOfflinePrayer'
  | 'liveLabel'
  | 'share'
  | 'openingCharge'
  | 'coreTeaching'
  | 'supportingScriptures'
  | 'spiritualInsight'
  | 'biblicalExample'
  | 'warningCorrection'
  | 'declaration'
  | 'summary'
  | 'home'
  | 'bible'
  | 'community'
  | 'profile'
  | 'chapter'
  | 'previousChapter'
  | 'nextChapter'
  | 'previousBook'
  | 'nextBook'
  | 'downloading'
  | 'offline'
  | 'cached'
  | 'downloadForOffline'
  | 'jumpTo'
  | 'go'
  | 'chooseBook'
  | 'bibleVersions'
  | 'cancel'
  | 'removeAdmin'
  | 'promoteToAdmin'
  | 'removeFromGroup'
  | 'confirm'
  | 'areYouSureRemoveMember'
  | 'remove'
  | 'admin'
  | 'you'
  | 'groupInfo'
  | 'members'
  | 'wall'
  | 'eventsTab'
  | 'groupsTab'
  | 'searchGroups'
  | 'noGroupsFound'
  | 'tryDifferentSearch'
  | 'couldNotOpenStream'
  | 'myProfile'
  | 'editProfile'
  | 'account'
  | 'personalDetails'
  | 'email'
  | 'appSettings'
  | 'themeLabel'
  | 'appearance'
  | 'systemDefault'
  | 'dark'
  | 'light'
  | 'dailyVerseReminder'
  | 'off'
  | 'supportLegal'
  | 'helpCenter'
  | 'privacyPolicy'
  | 'termsOfService'
  | 'adminPendingVerification'
  | 'proof'
  | 'approve'
  | 'reject'
  | 'approved'
  | 'rejected'
  | 'signOut'
  | 'welcomeBack'
  | 'signInSubtitle'
  | 'orContinueWithEmail'
  | 'emailPlaceholder'
  | 'passwordPlaceholder'
  | 'signInBtn'
  | 'newToGather'
  | 'createAccount'
  | 'firstName'
  | 'lastName'
  | 'emailAddress'
  | 'password'
  | 'confirmPassword'
  | 'alreadyMember'
  | 'checkEmail'
  | 'verificationSentTo'
  | 'iveVerifiedEmail'
  | 'skipForNow'
  | 'resendEmail'
  | 'sending'
  | 'signUpAgain'
  | 'goodMorning'
  | 'goodAfternoon'
  | 'goodEvening'
  | 'goodNight'
  | 'verseOfTheDay'
  | 'quickAccess'
  | 'nextService'
  | 'latestSermons'
  | 'viewAll'
  | 'watchNow'
  | 'streakStatusStart'
  | 'streakStatusKeep'
  | 'streakStatusToday'
  | 'streakStatusNew'
  | 'newCommunity'
  | 'bringPeopleTogether'
  | 'identity'
  | 'groupName'
  | 'aboutCommunity'
  | 'createGroupBtn'
  | 'verifiedOnlyGroups'
  | 'changePhoto'
  | 'uploadPhoto'
  | 'visualPrivacy'
  | 'chooseIcon'
  | 'privateCommunity'
  | 'privateCommunitySub'
  | 'groupNamePlaceholder'
  | 'aboutCommunityPlaceholder'
  | 'member'
  | 'membersPlural'
  | 'couldNotSendImage'
  | 'uploadFailed'
  | 'userAddedToGroup'
  | 'requestDeclined'
  | 'failedToApprove'
  | 'failedToReject'
  | 'joinRequests'
  | 'noPendingRequests'
  | 'allCaughtUpRequests'
  | 'decline'
  | 'supportAppMaintenance'
  | 'totalAppSupport'
  | 'chooseAmount'
  | 'supportNaira'
  | 'recentAppSupport'
  | 'thankYou'
  | 'supportReceived'
  | 'signInRequired'
  | 'emailRequiredForGiving'
  | 'paymentCancelled'
  | 'paymentCancelledSub'
  | 'paymentError'
  | 'paymentErrorSub'
  | 'appMaintenance'
  | 'appSupport'
  | 'prayerWall'
  | 'noPrayerRequests'
  | 'noMineRequests'
  | 'noAnsweredRequests'
  | 'noUrgentRequests'
  | 'beFirstPrayer'
  | 'requestPosted'
  | 'showingSavedRequests'
  | 'aiPrayerAssistant'
  | 'personalizedSupport'
  | 'howAreYouFeeling'
  | 'feelingAnxiousPlaceholder'
  | 'generatePrayer'
  | 'aPrayerForYou'
  | 'new'
  | 'shareHeartHelper'
  | 'inputRequired'
  | 'shareFeeling'
  | 'couldNotGeneratePrayer'
  | 'failedToGeneratePrayer'
  | 'error'
  | 'unexpectedError'
  | 'loginFailed'
  | 'emailRequired'
  | 'validEmailRequired'
  | 'passwordRequired'
  | 'stepXofY'
  | 'getStarted'
  | 'continue'
  | 'continueAsGuest'
  | 'swipeToExplore'
  | 'onboarding1Verse'
  | 'onboarding1Ref'
  | 'onboarding1Title'
  | 'onboarding1Sub'
  | 'onboarding1Eyebrow'
  | 'onboarding2Verse'
  | 'onboarding2Ref'
  | 'onboarding2Title'
  | 'onboarding2Sub'
  | 'onboarding2Eyebrow'
  | 'onboarding3Verse'
  | 'onboarding3Ref'
  | 'onboarding3Title'
  | 'onboarding3Sub'
  | 'onboarding3Eyebrow';

const LOCALE_CODES: Record<AppLocale, string> = {
  en: 'en-US',
  fr: 'fr-FR',
};

const TRANSLATIONS: Record<AppLocale, Record<TranslationKey, string>> = {
  en: {
    today: 'Today',
    dailyDevotional: 'Daily Devotional',
    markAsRead: 'Mark as Read',
    readDone: 'Read ✓',
    noDevotionalToday: 'No devotional today.',
    savedAtPhrase: 'Saved {date} at {time}',
    savedOfflineTitle: 'Saved offline',
    savedOfflineRsvp: 'Your RSVP will sync automatically when you are back online.',
    savedOfflinePrayer: 'Your prayer request will post when you are back online.',
    liveLabel: 'LIVE:',
    share: 'Share',
    openingCharge: 'Opening Charge',
    coreTeaching: 'Core Teaching',
    supportingScriptures: 'Supporting Scriptures',
    spiritualInsight: 'Spiritual Insight',
    biblicalExample: 'Biblical Example',
    warningCorrection: 'Warning / Correction',
    declaration: 'Declaration',
    summary: 'Summary',
    home: 'Home',
    bible: 'Bible',
    community: 'Community',
    profile: 'Profile',
    chapter: 'Chapter',
    previousChapter: 'Previous Chapter',
    nextChapter: 'Next Chapter',
    previousBook: 'Previous Book',
    nextBook: 'Next Book',
    downloading: 'Downloading',
    offline: 'Offline',
    cached: 'Cached',
    downloadForOffline: 'Download for offline',
    jumpTo: 'Jump to',
    go: 'Go',
    chooseBook: 'Choose a book',
    bibleVersions: 'Bible Versions',
    cancel: 'Cancel',
    removeAdmin: 'Remove Admin',
    promoteToAdmin: 'Promote to Admin',
    removeFromGroup: 'Remove from Group',
    confirm: 'Confirm',
    areYouSureRemoveMember: 'Are you sure you want to remove this member?',
    remove: 'Remove',
    admin: 'Admin',
    you: 'You',
    groupInfo: 'Group Info',
    members: 'Members',
    wall: 'Wall',
    eventsTab: 'Events',
    groupsTab: 'Groups',
    searchGroups: 'Search groups...',
    noGroupsFound: 'No groups found',
    tryDifferentSearch: 'Try a different search.',
    couldNotOpenStream: 'Could not open stream.',
    myProfile: 'My Profile',
    editProfile: 'Edit Profile',
    account: 'Account',
    personalDetails: 'Personal details',
    email: 'Email',
    appSettings: 'App Settings',
    themeLabel: 'Theme',
    appearance: 'Appearance',
    systemDefault: 'System default',
    dark: 'Dark',
    light: 'Light',
    dailyVerseReminder: 'Daily Verse Reminder',
    off: 'Off',
    supportLegal: 'Support & Legal',
    helpCenter: 'Help Center',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    adminPendingVerification: 'Admin: Pending Verification',
    proof: 'Proof',
    approve: 'Approve',
    reject: 'Reject',
    approved: 'Approved',
    rejected: 'Rejected',
    signOut: 'Sign Out',
    welcomeBack: 'Welcome Back',
    signInSubtitle: 'Sign in to your kingdom community',
    orContinueWithEmail: 'or continue with email',
    emailPlaceholder: 'youremail@domain.com',
    passwordPlaceholder: 'Enter your password',
    signInBtn: 'SIGN IN',
    newToGather: 'New to Gather?',
    createAccount: 'Create account',
    firstName: 'First name',
    lastName: 'Last name',
    emailAddress: 'Email Address',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    alreadyMember: 'Already a member?',
    checkEmail: 'Check your email',
    verificationSentTo: "We've sent a verification link to",
    iveVerifiedEmail: "I'VE VERIFIED MY EMAIL",
    skipForNow: 'Skip for now →',
    resendEmail: 'Resend verification email',
    sending: 'Sending...',
    signUpAgain: 'Sign up again',
    goodMorning: 'Good morning,',
    goodAfternoon: 'Good afternoon,',
    goodEvening: 'Good evening,',
    goodNight: 'Good night,',
    verseOfTheDay: 'Verse of the day',
    quickAccess: 'Quick access',
    nextService: 'Next Service',
    latestSermons: 'Latest Sermons',
    viewAll: 'View all',
    watchNow: 'Watch now',
    streakStatusStart: 'Start your journey!',
    streakStatusKeep: 'Keep it up!',
    streakStatusToday: 'Read today to maintain!',
    streakStatusNew: 'Start a new streak!',
    newCommunity: 'New Community',
    bringPeopleTogether: 'Bring people together for God',
    identity: 'Identity',
    groupName: 'Group Name',
    aboutCommunity: 'About the Community',
    createGroupBtn: 'CREATE COMMUNITY',
    verifiedOnlyGroups: 'Only verified members can create new groups. Complete your profile verification to start a community.',
    changePhoto: 'Change Photo',
    uploadPhoto: 'Upload Photo',
    visualPrivacy: 'Visual & Privacy',
    chooseIcon: 'Choose an Icon',
    privateCommunity: 'Private Community',
    privateCommunitySub: 'Members must be invited or approved by an admin to join.',
    groupNamePlaceholder: 'e.g. Wednesday Morning Prayer',
    aboutCommunityPlaceholder: 'What is this group for? How can members participate?',
    member: 'member',
    membersPlural: 'members',
    couldNotSendImage: 'Could not send image.',
    uploadFailed: 'Upload failed',
    userAddedToGroup: 'The user has been added to the group.',
    requestDeclined: 'The request has been declined.',
    failedToApprove: 'Failed to approve request',
    failedToReject: 'Failed to reject request',
    joinRequests: 'Join Requests',
    noPendingRequests: 'No pending requests',
    allCaughtUpRequests: 'All caught up! New requests to join this private group will appear here.',
    decline: 'Decline',
    supportAppMaintenance: 'Support App Maintenance',
    totalAppSupport: 'Total App Support',
    chooseAmount: 'Choose amount',
    supportNaira: 'Support ₦{amount}',
    recentAppSupport: 'Recent App Support',
    thankYou: 'Thank you!',
    supportReceived: 'Your support for app maintenance has been received.',
    signInRequired: 'Sign in required',
    emailRequiredForGiving: 'Please add an email to your profile before supporting the app.',
    paymentCancelled: 'Payment cancelled',
    paymentCancelledSub: 'Your app maintenance support was not completed.',
    paymentError: 'Payment error',
    paymentErrorSub: 'Something went wrong during payment.',
    appMaintenance: 'App Maintenance',
    appSupport: 'App Support',
    prayerWall: 'Prayer Wall',
    noPrayerRequests: 'No prayer requests yet',
    noMineRequests: 'You have not posted any requests yet. Tap + to share one.',
    noAnsweredRequests: 'No answered requests yet. Keep praying with the church family.',
    noUrgentRequests: 'No urgent requests right now.',
    beFirstPrayer: 'Be the first to post a prayer request and encourage others.',
    requestPosted: 'Request Posted!',
    showingSavedRequests: 'Showing saved requests.',
    aiPrayerAssistant: 'AI Prayer Assistant',
    personalizedSupport: 'Personalized spiritual support',
    howAreYouFeeling: 'How are you feeling today?',
    feelingAnxiousPlaceholder: "e.g., I'm feeling anxious about my exams...",
    generatePrayer: 'Generate Prayer',
    aPrayerForYou: 'A Prayer For You',
    new: 'New',
    shareHeartHelper: "Share your heart above, and I'll help you find the words to talk to God.",
    inputRequired: 'Input required',
    shareFeeling: 'Please share what you are feeling.',
    couldNotGeneratePrayer: 'Could not generate prayer. Please try again.',
    failedToGeneratePrayer: 'Failed to generate prayer.',
    error: 'Error',
    unexpectedError: 'An unexpected error occurred. Please try again.',
    loginFailed: 'Login failed',
    emailRequired: 'Email is required',
    validEmailRequired: 'Enter a valid email address',
    passwordRequired: 'Password is required',
    stepXofY: 'Step {x} of {y}',
    getStarted: 'GET STARTED',
    continue: 'CONTINUE',
    continueAsGuest: 'Continue as Guest',
    swipeToExplore: 'Swipe to explore',
    onboarding1Verse: '"Where two or three gather in my name, there am I with them."',
    onboarding1Ref: 'Matthew 18:20',
    onboarding1Title: 'Welcome to Gather',
    onboarding1Sub: 'The digital home of {churchName}',
    onboarding1Eyebrow: 'Royal welcome',
    onboarding2Verse: '"Trust in the Lord with all your heart and lean not on your own understanding."',
    onboarding2Ref: 'Proverbs 3:5',
    onboarding2Title: 'Grow in the Word',
    onboarding2Sub: 'Daily verses, reading plans, highlights, and notes in one calm rhythm.',
    onboarding2Eyebrow: 'Daily formation',
    onboarding3Verse: '"And let us consider how we may spur one another on toward love and good deeds."',
    onboarding3Ref: 'Hebrews 10:24',
    onboarding3Title: 'Stay Connected',
    onboarding3Sub: 'Prayer, group chats, events, and live worship for the whole church family.',
    onboarding3Eyebrow: 'Church community',
  },
  fr: {
    today: "Aujourd'hui",
    dailyDevotional: 'Dévotion quotidienne',
    markAsRead: 'Marquer comme lu',
    readDone: 'Lu ✓',
    noDevotionalToday: 'Aucune dévotion aujourd’hui.',
    savedAtPhrase: 'Enregistré le {date} à {time}',
    savedOfflineTitle: 'Enregistré hors ligne',
    savedOfflineRsvp: 'Votre RSVP sera synchronisé automatiquement lorsque vous serez de nouveau en ligne.',
    savedOfflinePrayer: 'Votre demande de prière sera publiée lorsque vous serez de nouveau en ligne.',
    liveLabel: 'EN DIRECT :',
    share: 'Partager',
    openingCharge: "Charge d'ouverture",
    coreTeaching: "Enseignement central",
    supportingScriptures: "Écritures de soutien",
    spiritualInsight: "Aperçu spirituel",
    biblicalExample: "Exemple biblique",
    warningCorrection: "Avertissement / Correction",
    declaration: "Déclaration",
    summary: "Résumé",
    home: 'Accueil',
    bible: 'Bible',
    community: 'Communauté',
    profile: 'Profil',
    chapter: 'Chapitre',
    previousChapter: 'Chapitre précédent',
    nextChapter: 'Chapitre suivant',
    previousBook: 'Livre précédent',
    nextBook: 'Livre suivant',
    downloading: 'Téléchargement',
    offline: 'Hors ligne',
    cached: 'Mis en cache',
    downloadForOffline: 'Télécharger pour hors ligne',
    jumpTo: 'Aller à',
    go: 'Aller',
    chooseBook: 'Choisir un livre',
    bibleVersions: 'Versions de la Bible',
    cancel: 'Annuler',
    removeAdmin: 'Retirer Admin',
    promoteToAdmin: 'Promouvoir Admin',
    removeFromGroup: 'Retirer du groupe',
    confirm: 'Confirmer',
    areYouSureRemoveMember: 'Voulez-vous vraiment retirer ce membre ?',
    remove: 'Retirer',
    admin: 'Admin',
    you: 'Vous',
    groupInfo: 'Infos du groupe',
    members: 'Membres',
    wall: 'Mur',
    eventsTab: 'Événements',
    groupsTab: 'Groupes',
    searchGroups: 'Rechercher des groupes...',
    noGroupsFound: 'Aucun groupe trouvé',
    tryDifferentSearch: 'Essayez une autre recherche.',
    couldNotOpenStream: "Impossible d'ouvrir le flux.",
    myProfile: 'Mon profil',
    editProfile: 'Modifier le profil',
    account: 'Compte',
    personalDetails: 'Détails personnels',
    email: 'E-mail',
    appSettings: 'Paramètres',
    themeLabel: 'Thème',
    appearance: 'Apparence',
    systemDefault: 'Défaut système',
    dark: 'Sombre',
    light: 'Clair',
    dailyVerseReminder: 'Rappel du verset quotidien',
    off: 'Désactivé',
    supportLegal: 'Support et juridique',
    helpCenter: "Centre d'aide",
    privacyPolicy: 'Politique de confidentialité',
    termsOfService: "Conditions d'utilisation",
    adminPendingVerification: 'Admin : Vérification en attente',
    proof: 'Preuve',
    approve: 'Approuver',
    reject: 'Rejeter',
    approved: 'Approuvé',
    rejected: 'Rejeté',
    signOut: 'Déconnexion',
    welcomeBack: 'Bon retour',
    signInSubtitle: 'Connectez-vous à votre communauté',
    orContinueWithEmail: 'ou continuez avec votre e-mail',
    emailPlaceholder: 'votremail@domaine.com',
    passwordPlaceholder: 'Entrez votre mot de passe',
    signInBtn: 'SE CONNECTER',
    newToGather: 'Nouveau sur Gather ?',
    createAccount: 'Créer un compte',
    firstName: 'Prénom',
    lastName: 'Nom',
    emailAddress: 'Adresse e-mail',
    password: 'Mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    alreadyMember: 'Déjà membre ?',
    checkEmail: 'Vérifiez vos e-mails',
    verificationSentTo: 'Nous avons envoyé un lien de vérification à',
    iveVerifiedEmail: "J'AI VÉRIFIÉ MON E-MAIL",
    skipForNow: 'Passer pour le moment →',
    resendEmail: 'Renvoyer l’e-mail de vérification',
    sending: 'Envoi...',
    signUpAgain: "S'inscrire à nouveau",
    goodMorning: 'Bonjour,',
    goodAfternoon: 'Bon après-midi,',
    goodEvening: 'Bonsoir,',
    goodNight: 'Bonne nuit,',
    verseOfTheDay: 'Verset du jour',
    quickAccess: 'Accès rapide',
    nextService: 'Prochain service',
    latestSermons: 'Derniers sermons',
    viewAll: 'Tout voir',
    watchNow: 'Regarder maintenant',
    streakStatusStart: 'Commencez votre voyage !',
    streakStatusKeep: 'Continuez comme ça !',
    streakStatusToday: 'Lisez aujourd’hui pour maintenir !',
    streakStatusNew: 'Commencez une nouvelle série !',
    newCommunity: 'Nouvelle communauté',
    bringPeopleTogether: 'Rassembler les gens pour Dieu',
    identity: 'Identité',
    groupName: 'Nom du groupe',
    aboutCommunity: 'À propos de la communauté',
    createGroupBtn: 'CRÉER LA COMMUNAUTÉ',
    verifiedOnlyGroups: 'Seuls les membres vérifiés peuvent créer des groupes. Vérifiez votre profil pour commencer.',
    changePhoto: 'Changer la photo',
    uploadPhoto: 'Télécharger une photo',
    visualPrivacy: 'Visuel et confidentialité',
    chooseIcon: 'Choisir une icône',
    privateCommunity: 'Communauté privée',
    privateCommunitySub: 'Les membres doivent être invités ou approuvés par un admin.',
    groupNamePlaceholder: 'ex. Prière du mercredi matin',
    aboutCommunityPlaceholder: 'À quoi sert ce groupe ? Comment participer ?',
    member: 'membre',
    membersPlural: 'membres',
    couldNotSendImage: 'Impossible d’envoyer l’image.',
    uploadFailed: 'Échec du téléchargement',
    userAddedToGroup: 'L’utilisateur a été ajouté au groupe.',
    requestDeclined: 'La demande a été refusée.',
    failedToApprove: 'Échec de l’approbation de la demande',
    failedToReject: 'Échec du rejet de la demande',
    joinRequests: 'Demandes d’adhésion',
    noPendingRequests: 'Aucune demande en attente',
    allCaughtUpRequests: 'Tout est à jour ! Les nouvelles demandes apparaîtront ici.',
    decline: 'Refuser',
    supportAppMaintenance: 'Soutenir la maintenance de l’application',
    totalAppSupport: 'Soutien total à l’application',
    chooseAmount: 'Choisir le montant',
    supportNaira: 'Soutenir ₦{amount}',
    recentAppSupport: 'Soutien récent à l’application',
    thankYou: 'Merci !',
    supportReceived: 'Votre soutien pour la maintenance de l’application a été reçu.',
    signInRequired: 'Connexion requise',
    emailRequiredForGiving: 'Veuillez ajouter un e-mail à votre profil avant de soutenir l’application.',
    paymentCancelled: 'Paiement annulé',
    paymentCancelledSub: 'Votre soutien à la maintenance de l’application n’a pas été finalisé.',
    paymentError: 'Erreur de paiement',
    paymentErrorSub: 'Un problème est survenu lors du paiement.',
    appMaintenance: 'Maintenance de l’application',
    appSupport: 'Soutien à l’application',
    prayerWall: 'Mur de prière',
    noPrayerRequests: 'Aucune demande de prière pour le moment',
    noMineRequests: 'Vous n’avez pas encore posté de demandes. Appuyez sur + pour en partager une.',
    noAnsweredRequests: 'Aucune demande exaucée pour le moment. Continuez à prier avec la famille de l’église.',
    noUrgentRequests: 'Aucune demande urgente pour le moment.',
    beFirstPrayer: 'Soyez le premier à poster une demande de prière et encouragez les autres.',
    requestPosted: 'Demande postée !',
    showingSavedRequests: 'Affichage des demandes enregistrées.',
    aiPrayerAssistant: 'Assistant de prière IA',
    personalizedSupport: 'Soutien spirituel personnalisé',
    howAreYouFeeling: 'Comment vous sentez-vous aujourd’hui ?',
    feelingAnxiousPlaceholder: 'ex. Je me sens anxieux pour mes examens...',
    generatePrayer: 'Générer une prière',
    aPrayerForYou: 'Une prière pour vous',
    new: 'Nouveau',
    shareHeartHelper: 'Partagez votre cœur ci-dessus, et je vous aiderai à trouver les mots pour parler à Dieu.',
    inputRequired: 'Entrée requise',
    shareFeeling: 'S’il vous plaît, partagez ce que vous ressentez.',
    couldNotGeneratePrayer: 'Impossible de générer la prière. Veuillez réessayer.',
    failedToGeneratePrayer: 'Échec de la génération de la prière.',
    error: 'Erreur',
    unexpectedError: 'Une erreur inattendue s’est produite. Veuillez réessayer.',
    loginFailed: 'Échec de la connexion',
    emailRequired: 'L’e-mail est requis',
    validEmailRequired: 'Entrez une adresse e-mail valide',
    passwordRequired: 'Le mot de passe est requis',
    stepXofY: 'Étape {x} sur {y}',
    getStarted: 'COMMENCER',
    continue: 'CONTINUER',
    continueAsGuest: 'Continuer en tant qu’invité',
    swipeToExplore: 'Balayez pour explorer',
    onboarding1Verse: '"Là où deux ou trois sont assemblés en mon nom, je suis au milieu d’eux."',
    onboarding1Ref: 'Matthieu 18:20',
    onboarding1Title: 'Bienvenue sur Gather',
    onboarding1Sub: 'La maison numérique de {churchName}',
    onboarding1Eyebrow: 'Bienvenue royale',
    onboarding2Verse: '"Confie-toi en l’Éternel de tout ton cœur, et ne t’appuie pas sur ta sagesse."',
    onboarding2Ref: 'Proverbes 3:5',
    onboarding2Title: 'Grandir dans la Parole',
    onboarding2Sub: 'Versets quotidiens, plans de lecture, surlignages et notes dans un rythme calme.',
    onboarding2Eyebrow: 'Formation quotidienne',
    onboarding3Verse: '"Veillons les uns sur les autres pour nous exciter à la charité et aux bonnes œuvres."',
    onboarding3Ref: 'Hébreux 10:24',
    onboarding3Title: 'Restez connecté',
    onboarding3Sub: 'Prière, chats de groupe, événements et culte en direct pour toute la famille de l’église.',
    onboarding3Eyebrow: 'Communauté d’église',
  },
};

export const getDeviceLocale = (): AppLocale => {
  const rawLocale = Localization.getLocales()?.[0]?.languageCode ?? 'en';
  return rawLocale === 'fr' ? 'fr' : 'en';
};

export const t = (key: TranslationKey, locale?: AppLocale) => {
  const resolvedLocale = locale ?? getDeviceLocale();
  return TRANSLATIONS[resolvedLocale][key] ?? TRANSLATIONS.en[key];
};

export const formatAppDate = (
  date: Date,
  options?: Intl.DateTimeFormatOptions,
  locale?: AppLocale
) => date.toLocaleDateString(LOCALE_CODES[locale ?? getDeviceLocale()], options);

export const formatAppTime = (
  date: Date,
  options?: Intl.DateTimeFormatOptions,
  locale?: AppLocale
) => date.toLocaleTimeString(LOCALE_CODES[locale ?? getDeviceLocale()], options);
